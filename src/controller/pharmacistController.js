import { eq } from "drizzle-orm";
import db from "../config/db.js";

import {
  pharmacistProfiles,
  pharmacies,
} from "../../drizzle/schema.js";

// POST /api/pharmacists
export const createPharmacist = async (req, res, next) => {
  try {
    const { pharmacyId, licenseNo, name } = req.body;

    const userId = req.user.id;

    if (!pharmacyId || !licenseNo) {
      return res.status(400).json({
        success: false,
        message: "Pharmacy ID and license number are required",
      });
    }

    // Check if pharmacy exists
    const [pharmacy] = await db
      .select()
      .from(pharmacies)
      .where(eq(pharmacies.id, pharmacyId))
      .limit(1);

    if (!pharmacy) {
      return res.status(404).json({
        success: false,
        message: "Pharmacy not found",
      });
    }

    // Check if user is already registered as a pharmacist
    const [existingUser] = await db
      .select()
      .from(pharmacistProfiles)
      .where(eq(pharmacistProfiles.userId, userId))
      .limit(1);

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "You are already registered as a pharmacist",
      });
    }

    // Check if license number is already used
    const [existingLicense] = await db
      .select()
      .from(pharmacistProfiles)
      .where(eq(pharmacistProfiles.licenseNo, licenseNo))
      .limit(1);

    if (existingLicense) {
      return res.status(409).json({
        success: false,
        message: "Pharmacist license already registered",
      });
    }

    const [pharmacist] = await db
      .insert(pharmacistProfiles)
      .values({
        pharmacyId,
        licenseNo,
        name: name ?? req.user.name,
        userId,
      })
      .returning();

    return res.status(201).json({
      success: true,
      message: "Pharmacist registered successfully",
      pharmacist,
    });
  } catch (error) {
    next(error);
  }
};


// GET /api/pharmacists/me
export const getMyPharmacistProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [pharmacist] = await db
      .select()
      .from(pharmacistProfiles)
      .where(eq(pharmacistProfiles.userId, userId))
      .limit(1);

    if (!pharmacist) {
      return res.status(404).json({
        success: false,
        message: "Pharmacist profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      pharmacist,
    });
  } catch (error) {
    next(error);
  }
};


// GET /api/pharmacists/:id
export const getPharmacist = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [pharmacist] = await db
      .select()
      .from(pharmacistProfiles)
      .where(eq(pharmacistProfiles.id, id))
      .limit(1);

    if (!pharmacist) {
      return res.status(404).json({
        success: false,
        message: "Pharmacist not found",
      });
    }

    return res.status(200).json({
      success: true,
      pharmacist,
    });
  } catch (error) {
    next(error);
  }
};


// PUT /api/pharmacists/me
export const updateMyPharmacistProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { pharmacyId, licenseNo, name } = req.body;

    const [pharmacist] = await db
      .update(pharmacistProfiles)
      .set({
        ...(pharmacyId !== undefined && { pharmacyId }),
        ...(licenseNo !== undefined && { licenseNo }),
        ...(name !== undefined && { name }),
      })
      .where(eq(pharmacistProfiles.userId, userId))
      .returning();

    if (!pharmacist) {
      return res.status(404).json({
        success: false,
        message: "Pharmacist profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Pharmacist profile updated successfully",
      pharmacist,
    });
  } catch (error) {
    next(error);
  }
};


// DELETE /api/pharmacists/me
export const deleteMyPharmacistProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [pharmacist] = await db
      .delete(pharmacistProfiles)
      .where(eq(pharmacistProfiles.userId, userId))
      .returning();

    if (!pharmacist) {
      return res.status(404).json({
        success: false,
        message: "Pharmacist profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Pharmacist profile deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};