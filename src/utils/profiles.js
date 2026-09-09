import { eq } from "drizzle-orm";

import {
  doctorProfiles,
  patientProfiles,
  pharmacistProfiles,
} from "../../drizzle/schema.js";

/**
 * Profile lookups keyed on users.id (what `userauthenticate` puts on req.user).
 *
 * Each takes a `runner` so callers can pass either the shared `db` handle or a
 * transaction object — drizzle exposes the same query API on both.
 */

export const getDoctorProfile = async (runner, userId) => {
  const [doctor] = await runner
    .select()
    .from(doctorProfiles)
    .where(eq(doctorProfiles.userId, userId))
    .limit(1);

  return doctor ?? null;
};

export const getPatientProfile = async (runner, userId) => {
  const [patient] = await runner
    .select()
    .from(patientProfiles)
    .where(eq(patientProfiles.userId, userId))
    .limit(1);

  return patient ?? null;
};

export const getPharmacistProfile = async (runner, userId) => {
  const [pharmacist] = await runner
    .select()
    .from(pharmacistProfiles)
    .where(eq(pharmacistProfiles.userId, userId))
    .limit(1);

  return pharmacist ?? null;
};

/**
 * Builds an error the global errorHandler turns into a JSON response with the
 * right status. Throwing inside a `db.transaction` callback rolls the
 * transaction back, so this is how the controllers bail out mid-transaction.
 */
export const httpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};
