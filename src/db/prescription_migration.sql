-- =============================================================================
-- MediQuick — Prescription flow migration
-- Run against the Supabase Postgres database (SQL editor or psql).
-- Idempotent: safe to run more than once.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Pharmacies need identifying details.
--
-- The table shipped with only (id, license_no, accepts_teleorders), which is not
-- enough for a patient to choose where to send a prescription. All columns are
-- nullable so existing rows survive the migration.
-- -----------------------------------------------------------------------------
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS name         VARCHAR(255);
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS address      TEXT;
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS phone        VARCHAR(20);
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS village_town VARCHAR(100);
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS district     VARCHAR(100);
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS state        VARCHAR(100);
ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS pincode      VARCHAR(20);

-- -----------------------------------------------------------------------------
-- 2. Indexes for the three read paths this feature adds.
-- -----------------------------------------------------------------------------

-- Patient opening their prescription list; doctor opening theirs.
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient
  ON prescriptions(patient_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor
  ON prescriptions(doctor_id, issued_at DESC);

-- Pharmacist opening the queue for their own pharmacy, filtered by status.
CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_pharmacy
  ON pharmacy_orders(pharmacy_id, status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_patient
  ON pharmacy_orders(patient_id, requested_at DESC);

-- Loading a prescription's items, and an order's items.
CREATE INDEX IF NOT EXISTS idx_prescription_items_prescription
  ON prescription_items(prescription_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_order_items_order
  ON pharmacy_order_items(pharmacy_order_id);

-- Free-text medicine matching (see resolveMedicineId in prescriptionController.js)
-- does a case-insensitive prefix/substring match on medicines.name.
CREATE INDEX IF NOT EXISTS idx_medicines_name_lower
  ON medicines(LOWER(name));

-- Stock lookup when a pharmacist opens an order.
CREATE INDEX IF NOT EXISTS idx_pharmacy_inventory_lookup
  ON pharmacy_inventory(pharmacy_id, medicine_id);

-- -----------------------------------------------------------------------------
-- 3. Let the app read the pharmacy list during pharmacist sign-up.
--
-- The sign-up screen queries `pharmacies` with the Supabase anon key so the
-- pharmacist can pick the shop they work at. RLS is deliberately NOT enabled
-- here: if it is already off the policy is inert and reads keep working, and if
-- it is already on this is what makes them work. Enabling it would flip other
-- tables' anon writes to deny.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'pharmacies' AND policyname = 'Allow reading the pharmacy list'
  ) THEN
    CREATE POLICY "Allow reading the pharmacy list"
      ON pharmacies FOR SELECT TO anon, authenticated
      USING (true);
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 4. Status vocabularies used by the API.
--
-- Left as plain VARCHAR rather than enums/CHECKs so the existing rows and the
-- appointment feature are unaffected. Documented here as the contract:
--
--   prescriptions.status
--     'created'          doctor issued it, patient has not sent it anywhere
--     'sent_to_pharmacy' patient forwarded it to a pharmacy
--     'fulfilled'        every item dispensed
--     'cancelled'
--
--   pharmacy_orders.status
--     'pending' -> 'accepted' -> 'processing' -> 'ready' -> 'completed'
--     'rejected'
--     (matches PrescriptionStatus in front-end/lib/pharmacy-store.tsx)
--
--   pharmacy_order_items.status
--     'pending' | 'partial' | 'dispensed' | 'unavailable'
-- -----------------------------------------------------------------------------
