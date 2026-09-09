-- =============================================================================
-- One-off backfill: attach pharmacists who signed up before the pharmacy
-- picker existed.
--
-- Their `pharmacist_profiles.pharmacy_id` is NULL, so GET /api/v1/pharmacy-orders
-- has no shop to match incoming orders against and returns
-- "You are not linked to a pharmacy yet".
--
-- Run AFTER seed.sql (it needs the pharmacies to exist).
-- =============================================================================

-- 1. Who is unlinked? Run this first to see what you are about to change.
SELECT pp.id, pp.name, pp.license_no, u.email
FROM pharmacist_profiles pp
LEFT JOIN users u ON u.id = pp.user_id
WHERE pp.pharmacy_id IS NULL;

-- 2. What can they be linked to?
SELECT id, name, village_town, district FROM pharmacies ORDER BY name;

-- -----------------------------------------------------------------------------
-- 3a. Link ONE pharmacist to a specific pharmacy — the usual case.
--     Replace both values from the queries above.
-- -----------------------------------------------------------------------------
-- UPDATE pharmacist_profiles
-- SET pharmacy_id = (SELECT id FROM pharmacies WHERE name = 'Apex Community Pharmacy')
-- WHERE id = '<pharmacist_profiles.id>';

-- -----------------------------------------------------------------------------
-- 3b. Or link EVERY unlinked pharmacist to one pharmacy — fine for a demo where
--     everyone is testing against the same shop.
-- -----------------------------------------------------------------------------
UPDATE pharmacist_profiles
SET pharmacy_id = (
  SELECT id FROM pharmacies
  WHERE name = 'Apex Community Pharmacy'
  LIMIT 1
)
WHERE pharmacy_id IS NULL;

-- 4. Confirm.
SELECT pp.name AS pharmacist, ph.name AS pharmacy
FROM pharmacist_profiles pp
LEFT JOIN pharmacies ph ON ph.id = pp.pharmacy_id;
