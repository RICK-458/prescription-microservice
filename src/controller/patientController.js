import db from "../config/db.js";
import { patientProfiles } from "../../drizzle/schema.js";
import { eq } from "drizzle-orm";

export const addPatient = async (req, res, next) => {
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

    // Re-submitting the registration form updates the profile rather than
    // failing. A 409 here used to strand anyone who retried after a partial
    // sign-up, leaving them with a users row and no patient profile.
    if (existingPatient) {
      const [updated] = await db
        .update(patientProfiles)
        .set({
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
        .where(eq(patientProfiles.userId, userId))
        .returning();

      return res.status(200).json({
        success: true,
        message: "Patient profile updated",
        patient: updated,
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
    // errorHandler unwraps drizzle's "Failed query" and turns constraint
    // violations into something the user can act on.
    return next(error);
  }
};