-- =============================================================================
-- MediQuick — seed data for the prescription flow
--
-- Run AFTER prescription_migration.sql. Idempotent: re-running updates the same
-- rows rather than duplicating them (medicines are keyed on name, pharmacies on
-- license_no, inventory on pharmacy + medicine + batch).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Medicine catalogue
--
-- Names are what a doctor actually types, so the free-text matcher in
-- prescriptionController.js resolves them without a picker UI.
-- -----------------------------------------------------------------------------
INSERT INTO medicines (name, generic_name, brand, form, strength, manufacturer, category) VALUES
  ('Paracetamol 650mg',    'Paracetamol',              'Dolo',       'Tablet',  '650mg', 'Micro Labs',      'Analgesics'),
  ('Paracetamol 500mg',    'Paracetamol',              'Crocin',     'Tablet',  '500mg', 'GSK',             'Analgesics'),
  ('Amoxicillin 500mg',    'Amoxicillin',              'Mox',        'Capsule', '500mg', 'Ranbaxy',         'Antibiotics'),
  ('Azithromycin 500mg',   'Azithromycin',             'Azithral',   'Tablet',  '500mg', 'Alembic',         'Antibiotics'),
  ('Amoxiclav 625mg',      'Amoxicillin + Clavulanic', 'Augmentin',  'Tablet',  '625mg', 'GSK',             'Antibiotics'),
  ('Cefixime 200mg',       'Cefixime',                 'Taxim-O',    'Tablet',  '200mg', 'Alkem',           'Antibiotics'),
  ('Pantoprazole 40mg',    'Pantoprazole',             'Pan',        'Tablet',  '40mg',  'Alkem',           'Chronic Care'),
  ('Omeprazole 20mg',      'Omeprazole',               'Omez',       'Capsule', '20mg',  'Dr Reddys',       'Chronic Care'),
  ('Metformin 500mg SR',   'Metformin',                'Glycomet',   'Tablet',  '500mg', 'USV',             'Chronic Care'),
  ('Telmisartan 40mg',     'Telmisartan',              'Telma',      'Tablet',  '40mg',  'Glenmark',        'Chronic Care'),
  ('Amlodipine 5mg',       'Amlodipine',               'Amlokind',   'Tablet',  '5mg',   'Mankind',         'Chronic Care'),
  ('Atorvastatin 10mg',    'Atorvastatin',             'Atorva',     'Tablet',  '10mg',  'Zydus',           'Chronic Care'),
  ('Cetirizine 10mg',      'Cetirizine',               'Cetzine',    'Tablet',  '10mg',  'GSK',             'Analgesics'),
  ('Ibuprofen 400mg',      'Ibuprofen',                'Brufen',     'Tablet',  '400mg', 'Abbott',          'Analgesics'),
  ('Diclofenac 50mg',      'Diclofenac',               'Voveran',    'Tablet',  '50mg',  'Novartis',        'Analgesics'),
  ('ORS Sachet',           'Oral Rehydration Salts',   'Electral',   'Sachet',  '21.8g', 'FDC',             'First Aid'),
  ('Vitamin D3 60000 IU',  'Cholecalciferol',          'Calcirol',   'Sachet',  '60000IU','Cadila',         'Supplements'),
  ('Iron + Folic Acid',    'Ferrous Ascorbate',        'Autrin',     'Tablet',  '100mg', 'Pfizer',          'Supplements'),
  ('Salbutamol Inhaler',   'Salbutamol',               'Asthalin',   'Drops',   '100mcg','Cipla',           'Chronic Care'),
  ('Insulin Glargine',     'Insulin Glargine',         'Lantus',     'Injection','100IU/ml','Sanofi',       'Cold Chain')
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. Pharmacies
-- -----------------------------------------------------------------------------
INSERT INTO pharmacies (license_no, accepts_teleorders, name, address, phone, village_town, district, state, pincode) VALUES
  ('MH-PH-2201', TRUE,  'Apex Community Pharmacy', 'Main Bazaar Road, Near Bus Stand', '+91 98220 11001', 'Shirur',    'Pune',      'Maharashtra', '412210'),
  ('MH-PH-2202', TRUE,  'Sanjeevani Medical Store','Plot 14, Health Centre Complex',   '+91 98220 11002', 'Ranjangaon','Pune',      'Maharashtra', '412220'),
  ('MH-PH-2203', TRUE,  'Gram Arogya Pharmacy',    'Opposite Primary Health Centre',   '+91 98220 11003', 'Otur',      'Pune',      'Maharashtra', '412409'),
  ('MH-PH-2204', FALSE, 'City General Chemists',   '3rd Cross, Station Road',          '+91 98220 11004', 'Nashik',    'Nashik',    'Maharashtra', '422001')
ON CONFLICT (license_no) DO UPDATE SET
  name         = EXCLUDED.name,
  address      = EXCLUDED.address,
  phone        = EXCLUDED.phone,
  village_town = EXCLUDED.village_town,
  district     = EXCLUDED.district,
  state        = EXCLUDED.state,
  pincode      = EXCLUDED.pincode;

-- -----------------------------------------------------------------------------
-- 3. Inventory
--
-- Every teleorder-accepting pharmacy gets a row for every medicine, with stock
-- varied enough to exercise the "in stock / low stock / out of stock" states the
-- pharmacist UI renders. Deterministic, so re-running gives the same numbers.
-- -----------------------------------------------------------------------------
INSERT INTO pharmacy_inventory
  (pharmacy_id, medicine_id, quantity_available, reorder_threshold, expiry_date, batch_no, unit_price)
SELECT
  p.id,
  m.id,
  -- 0, 6, 40, 120, 250 … cycles so each pharmacy has some of each stock state
  (ARRAY[250, 120, 40, 6, 0])[(row_number() OVER (PARTITION BY p.id ORDER BY m.name) % 5) + 1],
  10,
  CURRENT_DATE + ((row_number() OVER (PARTITION BY p.id ORDER BY m.name) % 4 + 1) * INTERVAL '120 days'),
  'B' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD((row_number() OVER (PARTITION BY p.id ORDER BY m.name))::TEXT, 4, '0'),
  ROUND((3 + (row_number() OVER (PARTITION BY p.id ORDER BY m.name) % 20) * 1.7)::NUMERIC, 2)
FROM pharmacies p
CROSS JOIN medicines m
WHERE p.accepts_teleorders = TRUE
  AND NOT EXISTS (
    SELECT 1 FROM pharmacy_inventory pi
    WHERE pi.pharmacy_id = p.id AND pi.medicine_id = m.id
  );
