import { and, desc, eq, inArray } from "drizzle-orm";

import db from "../config/db.js";
import { inferQuantity, resolveMedicineId } from "../utils/medicines.js";
import {
  getDoctorProfile,
  getPatientProfile,
  getPharmacistProfile,
  httpError,
} from "../utils/profiles.js";

import {
  appointments,
  consultations,
  doctorProfiles,
  medicines,
  notifications,
  patientProfiles,
  pharmacies,
  pharmacistProfiles,
  pharmacyOrderItems,
  pharmacyOrders,
  prescriptionItems,
  prescriptions,
} from "../../drizzle/schema.js";

// ─── POST /api/v1/prescriptions ───────────────────────────────────────────────
// Doctor issues a prescription.
//
// `prescriptions.consultation_id` is NOT NULL and UNIQUE, but doctors prescribe
// straight from a patient card with no consultation in sight. So when the caller
// does not name one we create the appointment + consultation behind it, both
// already closed, and hang the prescription off that.
export const createPrescription = async (req, res, next) => {
  try {
    const {
      patientId,
      consultationId: requestedConsultationId,
      appointmentId: requestedAppointmentId,
      clinicalNote,
      chiefComplaint,
      validUntil,
      digitalSignature,
      items,
    } = req.body;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: "patientId is required",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one prescription item is required",
      });
    }

    const unnamed = items.findIndex((item) => !item?.name?.trim());
    if (unnamed !== -1) {
      return res.status(400).json({
        success: false,
        message: `Item ${unnamed + 1} is missing a medicine name`,
      });
    }

    const prescriptionId = await db.transaction(async (tx) => {
      const doctor = await getDoctorProfile(tx, req.user.id);
      if (!doctor) {
        throw httpError(403, "Only a doctor can issue a prescription");
      }

      const [patient] = await tx
        .select()
        .from(patientProfiles)
        .where(eq(patientProfiles.id, patientId))
        .limit(1);

      if (!patient) {
        throw httpError(404, "Patient profile not found");
      }

      const consultation = await resolveConsultation(tx, {
        requestedConsultationId,
        requestedAppointmentId,
        doctorId: doctor.id,
        patientId: patient.id,
        bookedByUserId: req.user.id,
        chiefComplaint: chiefComplaint ?? null,
        clinicalNote: clinicalNote ?? null,
      });

      // One prescription per consultation is a database-level constraint, so
      // report the clash rather than letting it surface as a 500.
      const [clash] = await tx
        .select({ id: prescriptions.id })
        .from(prescriptions)
        .where(eq(prescriptions.consultationId, consultation.id))
        .limit(1);

      if (clash) {
        throw httpError(
          409,
          "This consultation already has a prescription. Edit that one instead."
        );
      }

      const [prescription] = await tx
        .insert(prescriptions)
        .values({
          consultationId: consultation.id,
          patientId: patient.id,
          doctorId: doctor.id,
          status: "created",
          digitalSignature: digitalSignature ?? null,
          validUntil: validUntil ?? null,
        })
        .returning();

      const rows = [];
      for (const item of items) {
        const frequency = item.frequency?.trim() || item.timing?.trim() || "As directed";
        const duration = item.duration?.trim() || "As directed";
        const quantity = Number(item.quantity) > 0
          ? Math.floor(Number(item.quantity))
          : inferQuantity(frequency, duration);

        const medicineId = await resolveMedicineId(tx, item.name);

        rows.push({
          prescriptionId: prescription.id,
          medicineId,
          // Always keep what the doctor typed, even when it matched a catalogue
          // row — it is the legal record of what was written.
          medicineNameFreetext: item.name.trim().slice(0, 255),
          dosage: item.dosage?.trim() || item.dose?.trim() || "As directed",
          frequency,
          duration,
          instructions: item.instructions?.trim() || null,
          quantity,
        });
      }

      await tx.insert(prescriptionItems).values(rows);

      await notify(tx, patient.userId, "prescription_issued", {
        prescriptionId: prescription.id,
        doctorName: doctor.name,
        itemCount: rows.length,
        message: `Dr. ${doctor.name ?? "your doctor"} issued a new prescription with ${rows.length} medicine(s).`,
      });

      return prescription.id;
    });

    const prescription = await loadPrescription(db, prescriptionId);

    return res.status(201).json({
      success: true,
      message: "Prescription issued successfully",
      prescription,
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/v1/prescriptions/doctor/mine ────────────────────────────────────
export const getDoctorPrescriptions = async (req, res, next) => {
  try {
    const doctor = await getDoctorProfile(db, req.user.id);
    if (!doctor) {
      return res.status(403).json({
        success: false,
        message: "Doctor profile not found",
      });
    }

    const filters = [eq(prescriptions.doctorId, doctor.id)];
    if (req.query.status) {
      filters.push(eq(prescriptions.status, req.query.status));
    }

    const rows = await db
      .select({
        id: prescriptions.id,
        status: prescriptions.status,
        issuedAt: prescriptions.issuedAt,
        validUntil: prescriptions.validUntil,
        consultationId: prescriptions.consultationId,
        patientId: prescriptions.patientId,
        patientName: patientProfiles.name,
        clinicalNote: consultations.clinicalNotes,
      })
      .from(prescriptions)
      .innerJoin(patientProfiles, eq(prescriptions.patientId, patientProfiles.id))
      .leftJoin(consultations, eq(prescriptions.consultationId, consultations.id))
      .where(and(...filters))
      .orderBy(desc(prescriptions.issuedAt));

    return res.status(200).json({
      success: true,
      prescriptions: await attachItems(rows),
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/v1/prescriptions/patient/mine ───────────────────────────────────
export const getPatientPrescriptions = async (req, res, next) => {
  try {
    const patient = await getPatientProfile(db, req.user.id);
    if (!patient) {
      return res.status(403).json({
        success: false,
        message: "Patient profile not found",
      });
    }

    const filters = [eq(prescriptions.patientId, patient.id)];
    if (req.query.status) {
      filters.push(eq(prescriptions.status, req.query.status));
    }

    const rows = await db
      .select({
        id: prescriptions.id,
        status: prescriptions.status,
        issuedAt: prescriptions.issuedAt,
        validUntil: prescriptions.validUntil,
        consultationId: prescriptions.consultationId,
        doctorId: prescriptions.doctorId,
        doctorName: doctorProfiles.name,
        doctorSpecialization: doctorProfiles.specialization,
        clinicalNote: consultations.clinicalNotes,
      })
      .from(prescriptions)
      .innerJoin(doctorProfiles, eq(prescriptions.doctorId, doctorProfiles.id))
      .leftJoin(consultations, eq(prescriptions.consultationId, consultations.id))
      .where(and(...filters))
      .orderBy(desc(prescriptions.issuedAt));

    return res.status(200).json({
      success: true,
      prescriptions: await attachItems(rows),
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET /api/v1/prescriptions/:id ────────────────────────────────────────────
// Readable by the issuing doctor, the patient it was written for, or a
// pharmacist whose pharmacy is holding an order for it.
export const getPrescriptionById = async (req, res, next) => {
  try {
    const prescription = await loadPrescription(db, req.params.id);

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found",
      });
    }

    const allowed = await canReadPrescription(req.user.id, prescription);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this prescription",
      });
    }

    return res.status(200).json({ success: true, prescription });
  } catch (error) {
    next(error);
  }
};

// ─── POST /api/v1/prescriptions/:id/send-to-pharmacy ──────────────────────────
// Patient forwards their prescription to a pharmacy of their choosing, which is
// what puts it in that pharmacy's queue.
export const sendPrescriptionToPharmacy = async (req, res, next) => {
  try {
    const { pharmacyId } = req.body;
    const { id } = req.params;

    if (!pharmacyId) {
      return res.status(400).json({
        success: false,
        message: "pharmacyId is required",
      });
    }

    const orderId = await db.transaction(async (tx) => {
      const patient = await getPatientProfile(tx, req.user.id);
      if (!patient) {
        throw httpError(403, "Patient profile not found");
      }

      const [prescription] = await tx
        .select()
        .from(prescriptions)
        .where(eq(prescriptions.id, id))
        .limit(1);

      if (!prescription) {
        throw httpError(404, "Prescription not found");
      }

      if (prescription.patientId !== patient.id) {
        throw httpError(403, "This prescription belongs to another patient");
      }

      if (prescription.validUntil && new Date(prescription.validUntil) < new Date()) {
        throw httpError(400, "This prescription has expired");
      }

      const [pharmacy] = await tx
        .select()
        .from(pharmacies)
        .where(eq(pharmacies.id, pharmacyId))
        .limit(1);

      if (!pharmacy) {
        throw httpError(404, "Pharmacy not found");
      }

      if (pharmacy.acceptsTeleorders === false) {
        throw httpError(400, `${pharmacy.name ?? "This pharmacy"} does not accept online orders`);
      }

      // Re-sending to the same pharmacy should not stack duplicate queues on the
      // pharmacist's screen; hand back the order already in flight.
      const [existing] = await tx
        .select({ id: pharmacyOrders.id })
        .from(pharmacyOrders)
        .where(
          and(
            eq(pharmacyOrders.prescriptionId, prescription.id),
            eq(pharmacyOrders.pharmacyId, pharmacyId)
          )
        )
        .limit(1);

      if (existing) return existing.id;

      const items = await tx
        .select()
        .from(prescriptionItems)
        .where(eq(prescriptionItems.prescriptionId, prescription.id));

      if (items.length === 0) {
        throw httpError(400, "This prescription has no medicines to dispense");
      }

      const [order] = await tx
        .insert(pharmacyOrders)
        .values({
          prescriptionId: prescription.id,
          pharmacyId,
          patientId: patient.id,
          status: "pending",
        })
        .returning();

      await tx.insert(pharmacyOrderItems).values(
        items.map((item) => ({
          pharmacyOrderId: order.id,
          prescriptionItemId: item.id,
          medicineId: item.medicineId,
          quantityRequested: item.quantity,
          quantityDispensed: 0,
          status: "pending",
        }))
      );

      await tx
        .update(prescriptions)
        .set({ status: "sent_to_pharmacy" })
        .where(eq(prescriptions.id, prescription.id));

      // Every pharmacist working at that pharmacy gets the alert.
      const staff = await tx
        .select({ userId: pharmacistProfiles.userId })
        .from(pharmacistProfiles)
        .where(eq(pharmacistProfiles.pharmacyId, pharmacyId));

      for (const member of staff) {
        if (!member.userId) continue;
        await notify(tx, member.userId, "pharmacy_order_received", {
          pharmacyOrderId: order.id,
          prescriptionId: prescription.id,
          message: `New prescription from ${patient.name ?? "a patient"} with ${items.length} medicine(s).`,
        });
      }

      return order.id;
    });

    return res.status(201).json({
      success: true,
      message: "Prescription sent to pharmacy",
      pharmacyOrderId: orderId,
    });
  } catch (error) {
    next(error);
  }
};

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the consultation the prescription should hang off, creating the
 * appointment and consultation rows when the caller did not supply one.
 */
const resolveConsultation = async (tx, options) => {
  const {
    requestedConsultationId,
    requestedAppointmentId,
    doctorId,
    patientId,
    bookedByUserId,
    chiefComplaint,
    clinicalNote,
  } = options;

  if (requestedConsultationId) {
    const [consultation] = await tx
      .select()
      .from(consultations)
      .where(eq(consultations.id, requestedConsultationId))
      .limit(1);

    if (!consultation) {
      throw httpError(404, "Consultation not found");
    }

    if (consultation.doctorId !== doctorId) {
      throw httpError(403, "This consultation belongs to another doctor");
    }

    if (consultation.patientId !== patientId) {
      throw httpError(400, "This consultation is for a different patient");
    }

    // Fold in the note the doctor wrote while prescribing.
    if (clinicalNote && !consultation.clinicalNotes) {
      await tx
        .update(consultations)
        .set({ clinicalNotes: clinicalNote })
        .where(eq(consultations.id, consultation.id));
    }

    return consultation;
  }

  const appointmentId = requestedAppointmentId
    ? await verifyAppointment(tx, requestedAppointmentId, doctorId, patientId)
    : await createBackingAppointment(tx, {
        doctorId,
        patientId,
        bookedByUserId,
        reason: chiefComplaint ?? clinicalNote,
      });

  // consultations.appointment_id is UNIQUE — reuse rather than collide.
  const [existing] = await tx
    .select()
    .from(consultations)
    .where(eq(consultations.appointmentId, appointmentId))
    .limit(1);

  if (existing) return existing;

  const [consultation] = await tx
    .insert(consultations)
    .values({
      appointmentId,
      patientId,
      doctorId,
      chiefComplaint: chiefComplaint ?? null,
      clinicalNotes: clinicalNote ?? null,
      status: "completed",
      endedAt: new Date().toISOString(),
    })
    .returning();

  return consultation;
};

const verifyAppointment = async (tx, appointmentId, doctorId, patientId) => {
  const [appointment] = await tx
    .select()
    .from(appointments)
    .where(eq(appointments.id, appointmentId))
    .limit(1);

  if (!appointment) {
    throw httpError(404, "Appointment not found");
  }

  if (appointment.doctorId !== doctorId || appointment.patientId !== patientId) {
    throw httpError(403, "This appointment is not yours to prescribe against");
  }

  return appointment.id;
};

const createBackingAppointment = async (tx, { doctorId, patientId, bookedByUserId, reason }) => {
  const [appointment] = await tx
    .insert(appointments)
    .values({
      patientId,
      doctorId,
      mode: "teleconsultation",
      scheduledAt: new Date().toISOString(),
      status: "completed",
      bookedBy: "doctor",
      bookedByUserId,
      reason: reason ?? "Prescription issued without a scheduled appointment",
    })
    .returning();

  return appointment.id;
};

/** Loads one prescription with its items, patient and doctor. */
const loadPrescription = async (runner, id) => {
  const [row] = await runner
    .select({
      id: prescriptions.id,
      status: prescriptions.status,
      issuedAt: prescriptions.issuedAt,
      validUntil: prescriptions.validUntil,
      digitalSignature: prescriptions.digitalSignature,
      consultationId: prescriptions.consultationId,
      patientId: prescriptions.patientId,
      patientName: patientProfiles.name,
      doctorId: prescriptions.doctorId,
      doctorName: doctorProfiles.name,
      doctorSpecialization: doctorProfiles.specialization,
      doctorQualification: doctorProfiles.qualification,
      chiefComplaint: consultations.chiefComplaint,
      clinicalNote: consultations.clinicalNotes,
    })
    .from(prescriptions)
    .innerJoin(patientProfiles, eq(prescriptions.patientId, patientProfiles.id))
    .innerJoin(doctorProfiles, eq(prescriptions.doctorId, doctorProfiles.id))
    .leftJoin(consultations, eq(prescriptions.consultationId, consultations.id))
    .where(eq(prescriptions.id, id))
    .limit(1);

  if (!row) return null;

  const [withItems] = await attachItems([row]);
  return withItems;
};

/**
 * Loads items for a page of prescriptions in one query rather than one per row.
 */
const attachItems = async (rows) => {
  if (rows.length === 0) return [];

  const items = await db
    .select({
      id: prescriptionItems.id,
      prescriptionId: prescriptionItems.prescriptionId,
      medicineId: prescriptionItems.medicineId,
      name: prescriptionItems.medicineNameFreetext,
      catalogueName: medicines.name,
      form: medicines.form,
      strength: medicines.strength,
      dosage: prescriptionItems.dosage,
      frequency: prescriptionItems.frequency,
      duration: prescriptionItems.duration,
      instructions: prescriptionItems.instructions,
      quantity: prescriptionItems.quantity,
    })
    .from(prescriptionItems)
    .leftJoin(medicines, eq(prescriptionItems.medicineId, medicines.id))
    .where(
      inArray(
        prescriptionItems.prescriptionId,
        rows.map((row) => row.id)
      )
    );

  const byPrescription = new Map(rows.map((row) => [row.id, []]));
  for (const item of items) {
    byPrescription.get(item.prescriptionId)?.push(item);
  }

  return rows.map((row) => ({
    ...row,
    items: byPrescription.get(row.id) ?? [],
  }));
};

const canReadPrescription = async (userId, prescription) => {
  const [doctor, patient, pharmacist] = await Promise.all([
    getDoctorProfile(db, userId),
    getPatientProfile(db, userId),
    getPharmacistProfile(db, userId),
  ]);

  if (doctor?.id === prescription.doctorId) return true;
  if (patient?.id === prescription.patientId) return true;

  if (pharmacist?.pharmacyId) {
    const [order] = await db
      .select({ id: pharmacyOrders.id })
      .from(pharmacyOrders)
      .where(
        and(
          eq(pharmacyOrders.prescriptionId, prescription.id),
          eq(pharmacyOrders.pharmacyId, pharmacist.pharmacyId)
        )
      )
      .limit(1);

    if (order) return true;
  }

  return false;
};

/** Queues an in-app notification. Shared with pharmacyOrderController. */
export const notify = async (runner, userId, kind, payload) => {
  if (!userId) return;

  await runner.insert(notifications).values({
    userId,
    channel: "in_app",
    payload: { kind, ...payload },
    message: payload.message ?? null,
    status: "queued",
  });
};
