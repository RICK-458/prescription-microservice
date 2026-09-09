import db from "../config/db.js";
import { patientProfiles } from "../../drizzle/schema.js";
import { eq } from "drizzle-orm";

export const addPatient = async (req, res) => {
  try {
    // Get user ID from authentication middleware
    const userId = req.user.id;

    const {
      bloodGroup,
      emergencyContactName,
      emergencyContactPhone,
      allergies,
      chronicConditions,
      abhaId,
      address,
      villageTown,
      district,
      state,
      pincode,
      name,
    } = req.body;

    // Check if patient profile already exists
    const [existingPatient] = await db
      .select()
      .from(patientProfiles)
      .where(eq(patientProfiles.userId, userId))
      .limit(1);

    if (existingPatient) {
      return res.status(409).json({
        success: false,
        message: "Patient profile already exists",
      });
    }

    // Create patient profile
    const [patient] = await db
      .insert(patientProfiles)
      .values({
        userId,
        bloodGroup,
        emergencyContactName,
        emergencyContactPhone,
        allergies: allergies || [],
        chronicConditions: chronicConditions || [],
        abhaId,
        address,
        villageTown,
        district,
        state,
        pincode,
        name,
      })
      .returning();

    return res.status(201).json({
      success: true,
      message: "Patient profile created successfully",
      patient,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to create patient profile",
    });
  }
};