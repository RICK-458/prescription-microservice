-- Profiles must belong to a user.
--
-- doctor_profiles.user_id and pharmacist_profiles.user_id were nullable, while
-- registration built its payload as `...(dbUserId ? { user_id } : {})`. When the
-- id resolved to null the column was simply omitted and the insert SUCCEEDED,
-- producing a profile owned by nobody: invisible to getDoctorProfile(userId),
-- so that account could never prescribe or dispense, while its UNIQUE licence
-- number stayed claimed and blocked re-registration.
--
-- patient_profiles.user_id was already NOT NULL, which is why the same bug
-- surfaced there as a visible failure instead of silent corruption.
--
-- Idempotent: safe to re-run.

BEGIN;

-- 1. Remove orphans. Only ever remove profiles nothing references — a profile
--    carrying appointments or prescriptions must be linked to its user by hand,
--    never dropped.
DELETE FROM doctor_profiles d
WHERE d.user_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM appointments  a WHERE a.doctor_id = d.id)
  AND NOT EXISTS (SELECT 1 FROM prescriptions p WHERE p.doctor_id = d.id)
  AND NOT EXISTS (SELECT 1 FROM consultations c WHERE c.doctor_id = d.id);

DELETE FROM pharmacist_profiles ph
WHERE ph.user_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM dispensing_logs l WHERE l.pharmacist_id = ph.id);

-- 2. Close the door. This fails loudly if any orphan survived step 1, which is
--    the correct outcome: it means one carries data and needs a human decision.
ALTER TABLE doctor_profiles     ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE pharmacist_profiles ALTER COLUMN user_id SET NOT NULL;

COMMIT;
