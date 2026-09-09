import { eq } from "drizzle-orm";
import db from "../config/db.js";
import { pharmacies } from "../../drizzle/schema.js";

// POST /api/pharmacies
export const createPharmacy = async (req, res, next) => {
  try {
    const { licenseNo, acceptsTeleorders } = req.body;

    if (!licenseNo) {
      return res.status(400).json({
        success: false,
        message: "License number is required",
      });
    }

    // Check if pharmacy already exists
    const [existingPharmacy] = await db
      .select()
      .from(pharmacies)
      .where(eq(pharmacies.licenseNo, licenseNo))
      .limit(1);

    if (existingPharmacy) {
      return res.status(409).json({
        success: false,
        message: "Pharmacy already registered",
      });
    }

    const [pharmacy] = await db
      .insert(pharmacies)
      .values({
        licenseNo,
        acceptsTeleorders: acceptsTeleorders ?? true,
      })
      .returning();

    return res.status(201).json({
      success: true,
      message: "Pharmacy created successfully",
      pharmacy,
    });
  } catch (error) {
    next(error);
  }
};


// GET /api/pharmacies
export const getPharmacies = async (req, res, next) => {
  try {
    const allPharmacies = await db
      .select()
      .from(pharmacies);

    return res.status(200).json({
      success: true,
      pharmacies: allPharmacies,
    });
  } catch (error) {
    next(error);
  }
};


// GET /api/pharmacies/:id
export const getPharmacy = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [pharmacy] = await db
      .select()
      .from(pharmacies)
      .where(eq(pharmacies.id, id))
      .limit(1);

    if (!pharmacy) {
      return res.status(404).json({
        success: false,
        message: "Pharmacy not found",
      });
    }

    return res.status(200).json({
      success: true,
      pharmacy,
    });
  } catch (error) {
    next(error);
  }
};