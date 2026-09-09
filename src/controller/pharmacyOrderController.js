import { and, asc, desc, eq, gt, inArray, sql } from "drizzle-orm";

import db from "../config/db.js";
import { notify } from "./prescriptionController.js";
import {
  getPatientProfile,
  getPharmacistProfile,
  httpError,
} from "../utils/profiles.js";

import {
  dispensingLogs,
  doctorProfiles,
  medicines,
  patientProfiles,
  pharmacies,
  pharmacyInventory,
  pharmacyOrderItems,
  pharmacyOrders,
  prescriptionItems,
  prescriptions,
  users,
} from "../../drizzle/schema.js";

/**
 * Order lifecycle. Mirrors PrescriptionStatus in front-end/lib/pharmacy-store.tsx,
 * so the pharmacist UI's filter tabs map onto these one-to-one.
 */
const NEXT_STATUS = {
  pending: ["accepted", "rejected"],
  accepted: ["processing", "rejected"],
  processing: ["ready"],
  ready: ["completed"],
  completed: [],
  rejected: [],
};

// ─── GET /api/v1/pharmacy-orders ──────────────────────────────────────────────
// The pharmacist's queue, scoped to their own pharmacy. `?status=pending`
// filters; omitting it returns everything, newest first.
export const getPharmacyQueue = async (req, res, next) => {
  try {
    const pharmacist = await getPharmacistProfile(db, req.user.id);
    if (!pharmacist) {
      return res.status(403).json({
        success: false,
        message: "Pharmacist profile not found",
      });
    }

    if (!pharmacist.pharmacyId) {
      return res.status(400).json({
        success: false,
        message: "You are not linked to a pharmacy yet",
      });
    }

    const filters = [eq(pharmacyOrders.pharmacyId, pharmacist.pharmacyId)];
    if (req.query.status) {
      filters.push(eq(pharmacyOrders.status, req.query.status));
    }

    const rows = await db
      .select(orderSummaryColumns)
      .from(pharmacyOrders)
      .innerJoin(prescriptions, eq(pharmacyOrders.prescriptionId, prescriptions.id))
      .innerJoin(patientProfiles, eq(pharmacyOrders.patientId, patientProfiles.id))
      .innerJoin(users, eq(patientProfiles.userId, users.id))
      .innerJoin(doctorProfiles, eq(prescriptions.doctorId, doctorProfiles.id))
      .where(and(...filters))
      .orderBy(desc(pharmacyOrders.requestedAt));

    return res.status(200).json({
      success: true,
      orders: await attachOrderItems(rows, pharmacist.pharmacyId),
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/v1/pharmacy-orders/mine ─────────────────────────────────────────
// Patient tracking the orders they sent out.
export const getMyPharmacyOrders = async (req, res, next) => {
  try {
    const patient = await getPatientProfile(db, req.user.id);
    if (!patient) {
      return res.status(403).json({
        success: false,
        message: "Patient profile not found",
      });
    }

    const rows = await db
      .select({
        ...orderSummaryColumns,
        pharmacyName: pharmacies.name,
        pharmacyPhone: pharmacies.phone,
        pharmacyAddress: pharmacies.address,
      })
      .from(pharmacyOrders)
      .innerJoin(prescriptions, eq(pharmacyOrders.prescriptionId, prescriptions.id))
      .innerJoin(patientProfiles, eq(pharmacyOrders.patientId, patientProfiles.id))
      .innerJoin(users, eq(patientProfiles.userId, users.id))
      .innerJoin(doctorProfiles, eq(prescriptions.doctorId, doctorProfiles.id))
      .innerJoin(pharmacies, eq(pharmacyOrders.pharmacyId, pharmacies.id))
      .where(eq(pharmacyOrders.patientId, patient.id))
      .orderBy(desc(pharmacyOrders.requestedAt));

    return res.status(200).json({
      success: true,
      orders: await attachOrderItems(rows, null),
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/v1/pharmacy-orders/:id ──────────────────────────────────────────
export const getPharmacyOrderById = async (req, res, next) => {
  try {
    const { order, pharmacist } = await loadAuthorizedOrder(req, { allowPatient: true });

    // Stock levels are the pharmacy's business — a patient reading their own
    // order gets the line items without them.
    const [detailed] = await attachOrderItems([order], pharmacist?.pharmacyId ?? null);

    return res.status(200).json({ success: true, order: detailed });
  } catch (error) {
    next(error);
  }
};

// ─── PATCH /api/v1/pharmacy-orders/:id/status ─────────────────────────────────
export const updatePharmacyOrderStatus = async (req, res, next) => {
  try {
    const { status, pharmacistNotes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "status is required",
      });
    }

    const { order } = await loadAuthorizedOrder(req, { allowPatient: false });

    const allowed = NEXT_STATUS[order.status] ?? [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: allowed.length
          ? `Cannot move a '${order.status}' order to '${status}'. Allowed: ${allowed.join(", ")}.`
          : `A '${order.status}' order is final and cannot change status.`,
      });
    }

    const [updated] = await db
      .update(pharmacyOrders)
      .set({
        status,
        ...(pharmacistNotes !== undefined && { pharmacistNotes }),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(pharmacyOrders.id, order.id))
      .returning();

    if (status === "rejected") {
      // Let the patient take the prescription elsewhere.
      await db
        .update(prescriptions)
        .set({ status: "created" })
        .where(eq(prescriptions.id, order.prescriptionId));
    }

    await notify(db, order.patientUserId, "pharmacy_order_status", {
      pharmacyOrderId: order.id,
      status,
      message: statusMessage(status, order.pharmacyName, pharmacistNotes),
    });

    return res.status(200).json({
      success: true,
      message: `Order marked ${status}`,
      order: updated,
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/v1/pharmacy-orders/:id/dispense ────────────────────────────────
// Hands medicines over and draws down stock.
//
// Body: { items: [{ orderItemId, quantity, batchNo?, substitutedMedicineId?,
//                   unavailable? }] }
//
// Batches are consumed first-expiry-first-out unless a specific `batchNo` is
// named. Items whose medicine never matched the catalogue have no inventory row
// to draw from, so they are logged as dispensed without touching stock.
export const dispensePharmacyOrder = async (req, res, next) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one item to dispense is required",
      });
    }

    const { order, pharmacist } = await loadAuthorizedOrder(req, { allowPatient: false });

    if (["completed", "rejected"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `A '${order.status}' order cannot be dispensed against`,
      });
    }

    await db.transaction(async (tx) => {
      for (const entry of items) {
        const [orderItem] = await tx
          .select()
          .from(pharmacyOrderItems)
          .where(
            and(
              eq(pharmacyOrderItems.id, entry.orderItemId),
              eq(pharmacyOrderItems.pharmacyOrderId, order.id)
            )
          )
          .limit(1);

        if (!orderItem) {
          throw httpError(404, `Order item ${entry.orderItemId} is not part of this order`);
        }

        if (entry.unavailable) {
          await tx
            .update(pharmacyOrderItems)
            .set({ status: "unavailable" })
            .where(eq(pharmacyOrderItems.id, orderItem.id));
          continue;
        }

        const quantity = Math.floor(Number(entry.quantity));
        if (!Number.isFinite(quantity) || quantity <= 0) {
          throw httpError(400, "Dispensed quantity must be a positive whole number");
        }

        const alreadyDispensed = orderItem.quantityDispensed ?? 0;
        const remaining = orderItem.quantityRequested - alreadyDispensed;

        if (quantity > remaining) {
          throw httpError(
            400,
            `Cannot dispense ${quantity}: only ${remaining} of ${orderItem.quantityRequested} remain on this item`
          );
        }

        const medicineId = entry.substitutedMedicineId ?? orderItem.medicineId;
        const batchNo = medicineId
          ? await drawFromInventory(tx, {
              pharmacyId: pharmacist.pharmacyId,
              medicineId,
              quantity,
              batchNo: entry.batchNo,
            })
          : entry.batchNo ?? null;

        await tx.insert(dispensingLogs).values({
          pharmacyOrderItemId: orderItem.id,
          dispensedByUserId: req.user.id,
          quantity,
          batchNo,
        });

        const totalDispensed = alreadyDispensed + quantity;

        await tx
          .update(pharmacyOrderItems)
          .set({
            quantityDispensed: totalDispensed,
            status: totalDispensed >= orderItem.quantityRequested ? "dispensed" : "partial",
            ...(entry.substitutedMedicineId && {
              substitutedMedicineId: entry.substitutedMedicineId,
            }),
          })
          .where(eq(pharmacyOrderItems.id, orderItem.id));
      }

      // Once nothing is left outstanding the order and prescription are done.
      const remaining = await tx
        .select({ id: pharmacyOrderItems.id })
        .from(pharmacyOrderItems)
        .where(
          and(
            eq(pharmacyOrderItems.pharmacyOrderId, order.id),
            inArray(pharmacyOrderItems.status, ["pending", "partial"])
          )
        );

      if (remaining.length === 0) {
        await tx
          .update(pharmacyOrders)
          .set({ status: "completed", updatedAt: new Date().toISOString() })
          .where(eq(pharmacyOrders.id, order.id));

        await tx
          .update(prescriptions)
          .set({ status: "fulfilled" })
          .where(eq(prescriptions.id, order.prescriptionId));

        await notify(tx, order.patientUserId, "pharmacy_order_status", {
          pharmacyOrderId: order.id,
          status: "completed",
          message: `Your medicines from ${order.pharmacyName ?? "the pharmacy"} have been dispensed.`,
        });
      }
    });

    const [refreshed] = await attachOrderItems(
      [await reloadOrderSummary(order.id)],
      pharmacist.pharmacyId
    );

    return res.status(200).json({
      success: true,
      message: "Dispensing recorded",
      order: refreshed,
    });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/v1/pharmacy-orders/:id/notify ──────────────────────────────────
// Backs the pharmacist UI's quick-reply / SMS modal.
export const notifyPatientAboutOrder = async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message?.trim()) {
      return res.status(400).json({
        success: false,
        message: "message is required",
      });
    }

    const { order } = await loadAuthorizedOrder(req, { allowPatient: false });

    await notify(db, order.patientUserId, "pharmacy_message", {
      pharmacyOrderId: order.id,
      message: message.trim(),
    });

    return res.status(200).json({
      success: true,
      message: "Patient notified",
    });
  } catch (error) {
    next(error);
  }
};

// ─── helpers ──────────────────────────────────────────────────────────────────

const orderSummaryColumns = {
  id: pharmacyOrders.id,
  status: pharmacyOrders.status,
  pharmacistNotes: pharmacyOrders.pharmacistNotes,
  requestedAt: pharmacyOrders.requestedAt,
  updatedAt: pharmacyOrders.updatedAt,
  pharmacyId: pharmacyOrders.pharmacyId,
  prescriptionId: pharmacyOrders.prescriptionId,
  prescriptionStatus: prescriptions.status,
  issuedAt: prescriptions.issuedAt,
  validUntil: prescriptions.validUntil,
  patientId: pharmacyOrders.patientId,
  patientName: patientProfiles.name,
  patientUserId: patientProfiles.userId,
  patientPhone: users.phone,
  patientDob: users.dob,
  patientGender: users.gender,
  doctorName: doctorProfiles.name,
  doctorSpecialization: doctorProfiles.specialization,
};

/**
 * Loads the order named in :id and checks the caller may touch it. Pharmacists
 * may act on orders at their own pharmacy; patients may only read their own.
 */
const loadAuthorizedOrder = async (req, { allowPatient }) => {
  const [order] = await db
    .select(orderSummaryColumns)
    .from(pharmacyOrders)
    .innerJoin(prescriptions, eq(pharmacyOrders.prescriptionId, prescriptions.id))
    .innerJoin(patientProfiles, eq(pharmacyOrders.patientId, patientProfiles.id))
    .innerJoin(users, eq(patientProfiles.userId, users.id))
    .innerJoin(doctorProfiles, eq(prescriptions.doctorId, doctorProfiles.id))
    .where(eq(pharmacyOrders.id, req.params.id))
    .limit(1);

  if (!order) {
    throw httpError(404, "Pharmacy order not found");
  }

  const pharmacist = await getPharmacistProfile(db, req.user.id);

  if (pharmacist?.pharmacyId && pharmacist.pharmacyId === order.pharmacyId) {
    const [pharmacy] = await db
      .select({ name: pharmacies.name })
      .from(pharmacies)
      .where(eq(pharmacies.id, order.pharmacyId))
      .limit(1);

    return { order: { ...order, pharmacyName: pharmacy?.name ?? null }, pharmacist };
  }

  if (allowPatient) {
    const patient = await getPatientProfile(db, req.user.id);
    if (patient?.id === order.patientId) {
      return { order, pharmacist: null };
    }
  }

  throw httpError(403, "You do not have access to this order");
};

const reloadOrderSummary = async (orderId) => {
  const [order] = await db
    .select(orderSummaryColumns)
    .from(pharmacyOrders)
    .innerJoin(prescriptions, eq(pharmacyOrders.prescriptionId, prescriptions.id))
    .innerJoin(patientProfiles, eq(pharmacyOrders.patientId, patientProfiles.id))
    .innerJoin(users, eq(patientProfiles.userId, users.id))
    .innerJoin(doctorProfiles, eq(prescriptions.doctorId, doctorProfiles.id))
    .where(eq(pharmacyOrders.id, orderId))
    .limit(1);

  return order;
};

/**
 * Attaches each order's line items. When `pharmacyId` is given, every item also
 * carries the stock that pharmacy currently holds, which is what drives the
 * in stock / low stock / out of stock badges.
 */
const attachOrderItems = async (rows, pharmacyId) => {
  if (rows.length === 0) return [];

  const orderIds = rows.map((row) => row.id);

  const items = await db
    .select({
      id: pharmacyOrderItems.id,
      pharmacyOrderId: pharmacyOrderItems.pharmacyOrderId,
      prescriptionItemId: pharmacyOrderItems.prescriptionItemId,
      medicineId: pharmacyOrderItems.medicineId,
      substitutedMedicineId: pharmacyOrderItems.substitutedMedicineId,
      quantityRequested: pharmacyOrderItems.quantityRequested,
      quantityDispensed: pharmacyOrderItems.quantityDispensed,
      status: pharmacyOrderItems.status,
      name: prescriptionItems.medicineNameFreetext,
      catalogueName: medicines.name,
      form: medicines.form,
      strength: medicines.strength,
      dosage: prescriptionItems.dosage,
      frequency: prescriptionItems.frequency,
      duration: prescriptionItems.duration,
      instructions: prescriptionItems.instructions,
    })
    .from(pharmacyOrderItems)
    .innerJoin(
      prescriptionItems,
      eq(pharmacyOrderItems.prescriptionItemId, prescriptionItems.id)
    )
    .leftJoin(medicines, eq(pharmacyOrderItems.medicineId, medicines.id))
    .where(inArray(pharmacyOrderItems.pharmacyOrderId, orderIds));

  const stock = pharmacyId ? await stockLevels(pharmacyId, items) : new Map();

  const byOrder = new Map(rows.map((row) => [row.id, []]));
  for (const item of items) {
    const level = item.medicineId ? stock.get(item.medicineId) : null;

    byOrder.get(item.pharmacyOrderId)?.push({
      ...item,
      availableStock: item.medicineId ? level?.total ?? 0 : null,
      unitPrice: level?.unitPrice ?? null,
    });
  }

  return rows.map((row) => ({
    ...row,
    items: byOrder.get(row.id) ?? [],
  }));
};

/**
 * Sums unexpired stock per medicine for one pharmacy, alongside the cheapest
 * unit price on the shelf — the pharmacist screen totals an order from it.
 */
const stockLevels = async (pharmacyId, items) => {
  const medicineIds = [...new Set(items.map((item) => item.medicineId).filter(Boolean))];
  if (medicineIds.length === 0) return new Map();

  const rows = await db
    .select({
      medicineId: pharmacyInventory.medicineId,
      total: sql`coalesce(sum(${pharmacyInventory.quantityAvailable}), 0)`.mapWith(Number),
      unitPrice: sql`min(${pharmacyInventory.unitPrice})`.mapWith(Number),
    })
    .from(pharmacyInventory)
    .where(
      and(
        eq(pharmacyInventory.pharmacyId, pharmacyId),
        inArray(pharmacyInventory.medicineId, medicineIds),
        sql`${pharmacyInventory.expiryDate} >= current_date`
      )
    )
    .groupBy(pharmacyInventory.medicineId);

  return new Map(
    rows.map((row) => [row.medicineId, { total: row.total, unitPrice: row.unitPrice }])
  );
};

/**
 * Takes `quantity` units out of stock and returns the batch it came from.
 *
 * Without an explicit batch this consumes first-expiry-first-out, spanning
 * batches when one is short. Runs inside the caller's transaction, so a failure
 * here rolls the whole dispense back.
 */
const drawFromInventory = async (tx, { pharmacyId, medicineId, quantity, batchNo }) => {
  const filters = [
    eq(pharmacyInventory.pharmacyId, pharmacyId),
    eq(pharmacyInventory.medicineId, medicineId),
    gt(pharmacyInventory.quantityAvailable, 0),
    sql`${pharmacyInventory.expiryDate} >= current_date`,
  ];

  if (batchNo) {
    filters.push(eq(pharmacyInventory.batchNo, batchNo));
  }

  const batches = await tx
    .select()
    .from(pharmacyInventory)
    .where(and(...filters))
    .orderBy(asc(pharmacyInventory.expiryDate))
    .for("update");

  const total = batches.reduce((sum, batch) => sum + batch.quantityAvailable, 0);

  if (total < quantity) {
    throw httpError(
      400,
      batchNo
        ? `Batch ${batchNo} holds only ${total} unit(s), ${quantity} requested`
        : `Only ${total} unit(s) in stock, ${quantity} requested`
    );
  }

  let outstanding = quantity;
  const used = [];

  for (const batch of batches) {
    if (outstanding === 0) break;

    const take = Math.min(batch.quantityAvailable, outstanding);

    await tx
      .update(pharmacyInventory)
      .set({
        quantityAvailable: batch.quantityAvailable - take,
        lastUpdatedAt: new Date().toISOString(),
      })
      .where(eq(pharmacyInventory.id, batch.id));

    used.push(batch.batchNo);
    outstanding -= take;
  }

  return used.join(", ");
};

const statusMessage = (status, pharmacyName, notes) => {
  const where = pharmacyName ?? "the pharmacy";
  const suffix = notes?.trim() ? ` Note: ${notes.trim()}` : "";

  switch (status) {
    case "accepted":
      return `${where} accepted your prescription.${suffix}`;
    case "processing":
      return `${where} is preparing your medicines.${suffix}`;
    case "ready":
      return `Your medicines are ready for pickup at ${where}.${suffix}`;
    case "completed":
      return `Your order from ${where} is complete.${suffix}`;
    case "rejected":
      return `${where} could not fulfil your prescription.${suffix}`;
    default:
      return `Your order at ${where} is now ${status}.${suffix}`;
  }
};
