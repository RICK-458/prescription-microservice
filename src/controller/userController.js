import db from "../config/db.js";
import {
  users,
  patientProfiles,
  doctorProfiles,
  pharmacistProfiles,
  pharmacies,
} from "../../drizzle/schema.js";
import { and, eq, ne } from "drizzle-orm";

// Columns we hand back after the profile is filled in.
const userColumns = {
  id: users.id,
  clerkId: users.clerkId,
  name: users.name,
  email: users.email,
  phone: users.phone,
  dob: users.dob,
  gender: users.gender,
  preferredLanguage: users.preferredLanguage,
  
};

const DOB_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Fills in the profile fields collected by the register form.
// Runs after userauthenticate, so req.user.id is the row we update.
export const registerUser = async (req, res, next) => {
  try {
    const { dob, gender, preferredLanguage, phone } = req.body ?? {};

    const updates = {};
    const errors = [];

    if (dob !== undefined && dob !== null && dob !== "") {
      if (typeof dob !== "string" || !DOB_PATTERN.test(dob)) {
        errors.push("dob must be a date string in YYYY-MM-DD format");
      } else if (Number.isNaN(Date.parse(dob))) {
        errors.push("dob is not a valid date");
      } else if (Date.parse(dob) > Date.now()) {
        errors.push("dob cannot be in the future");
      } else {
        updates.dob = dob;
      }
    }

    if (gender !== undefined && gender !== null && gender !== "") {
      if (typeof gender !== "string" || gender.trim().length > 20) {
        errors.push("gender must be a string of at most 20 characters");
      } else {
        updates.gender = gender.trim();
      }
    }

    if (
      preferredLanguage !== undefined &&
      preferredLanguage !== null &&
      preferredLanguage !== ""
    ) {
      if (
        typeof preferredLanguage !== "string" ||
        preferredLanguage.trim().length > 10
      ) {
        errors.push(
          "preferredLanguage must be a string of at most 10 characters"
        );
      } else {
        updates.preferredLanguage = preferredLanguage.trim();
      }
    }

    if (phone !== undefined && phone !== null && phone !== "") {
      if (typeof phone !== "string" || phone.trim().length > 20) {
        errors.push("phone must be a string of at most 20 characters");
      } else {
        updates.phone = phone.trim();
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "Nothing to update. Send at least one of: dob, gender, preferredLanguage, phone.",
      });
    }

    // phone has a UNIQUE constraint - check before we hit the DB error.
    if (updates.phone) {
      const [phoneOwner] = await db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.phone, updates.phone), ne(users.id, req.user.id)))
        .limit(1);

      if (phoneOwner) {
        return res.status(409).json({
          success: false,
          message: "That phone number is already registered to another user.",
        });
      }
    }

    updates.updatedAt = new Date().toISOString();

    const [updated] = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, req.user.id))
      .returning(userColumns);

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "User not found.",
      });
    }

    req.user = updated;

    return res.status(200).json({
      success: true,
      message: "Registration details saved successfully",
      user: updated,
    });
  } catch (error) {
    // Race on the unique phone index, in case two requests slip past the check.
    if (error?.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "That phone number is already registered to another user.",
      });
    }
    next(error);
  }
};


// ─── GET /api/v1/user/me ──────────────────────────────────────────────────────
/**
 * The signed-in user with whichever role profile they hold, so the profile
 * screens can render real data instead of placeholders. One request rather
 * than three role-specific ones — the client does not have to know the role
 * before asking.
 *
 * `role` is null for an account that signed up but never completed a role
 * form; the screens show an empty state rather than someone else's details.
 */
export const getMyProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [account] = await db
      .select(userColumns)
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!account) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const [patient] = await db
      .select()
      .from(patientProfiles)
      .where(eq(patientProfiles.userId, userId))
      .limit(1);

    if (patient) {
      return res
        .status(200)
        .json({ success: true, user: account, role: "patient", profile: patient });
    }

    const [doctor] = await db
      .select()
      .from(doctorProfiles)
      .where(eq(doctorProfiles.userId, userId))
      .limit(1);

    if (doctor) {
      return res
        .status(200)
        .json({ success: true, user: account, role: "doctor", profile: doctor });
    }

    const [pharmacist] = await db
      .select()
      .from(pharmacistProfiles)
      .where(eq(pharmacistProfiles.userId, userId))
      .limit(1);

    if (pharmacist) {
      // The dispensary they work at is part of their profile as far as the
      // screen is concerned, so send it along rather than making the client
      // fetch it separately.
      let pharmacy = null;
      if (pharmacist.pharmacyId) {
        [pharmacy] = await db
          .select()
          .from(pharmacies)
          .where(eq(pharmacies.id, pharmacist.pharmacyId))
          .limit(1);
      }

      return res.status(200).json({
        success: true,
        user: account,
        role: "pharmacist",
        profile: pharmacist,
        pharmacy: pharmacy ?? null,
      });
    }

    return res
      .status(200)
      .json({ success: true, user: account, role: null, profile: null });
  } catch (error) {
    next(error);
  }
};
