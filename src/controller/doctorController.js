import db from "../config/db.js";
import { doctorProfiles } from "../../drizzle/schema.js";
import { eq, and } from "drizzle-orm";

export const addDoctor = async (req, res, next) => {
  try {
    // Comes from authentication middleware
    // This is users.id from your Supabase database
    const userId = req.user.id;

    const {
      specialization,
      qualification,
      licenseNo,
      experienceYears,
      consultationModes,
      consultationFee,
      name,
    } = req.body;

    // Check required fields
    if (!specialization || !qualification || !licenseNo) {
      return res.status(400).json({
        success: false,
        message: "Specialization, qualification and license number are required",
      });
    }

    // Check if this user is already registered as a doctor
    const [existingDoctor] = await db
      .select()
      .from(doctorProfiles)
      .where(eq(doctorProfiles.userId, userId))
      .limit(1);

    if (existingDoctor) {
      return res.status(409).json({
        success: false,
        message: "Doctor is already registered",
      });
    }

    // Check whether license number is already used
    const [existingLicense] = await db
      .select()
      .from(doctorProfiles)
      .where(eq(doctorProfiles.licenseNo, licenseNo))
      .limit(1);

    if (existingLicense) {
      return res.status(409).json({
        success: false,
        message: "License number is already registered",
      });
    }

    // Create doctor profile
    const [doctor] = await db
      .insert(doctorProfiles)
      .values({
        userId,
        specialization,
        qualification,
        licenseNo,
        experienceYears,
        consultationModes,
        consultationFee,
        name,
      })
      .returning();

    return res.status(201).json({
      success: true,
      message: "Doctor registered successfully",
      doctor,
    });

  } catch (error) {
    next(error);
  }
};



export const getAllDoctors = async (req, res) => {
  try {
    const doctors = await db
      .select()
      .from(doctorProfiles);

    return res.status(200).json({
      success: true,
      doctors,
    });

  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch doctors",
    });
  }
};