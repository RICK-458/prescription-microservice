/**
 * Pre-flight check: `npm run check:db`
 *
 * Confirms the database is reachable and that the two SQL files have been run,
 * so a failure points at the actual cause instead of surfacing later as an
 * empty pharmacy list or a 500 from an endpoint.
 */
import "dotenv/config";
import { sql } from "drizzle-orm";

if (!process.env.DATABASE_URL) {
  console.error("\n  ✗ DATABASE_URL is not set in back-end/database/.env\n");
  console.error("    Supabase → Project Settings → Database → Connection string → URI.");
  console.error("    Replace [YOUR-PASSWORD] with your database password.");
  console.error("    This is not the anon key and not the project URL.\n");
  process.exit(1);
}

// Imported dynamically so the missing-variable case above reports cleanly
// instead of as a stack trace from the pool constructor.
const { default: db } = await import("../config/db.js");

const checks = [];
const record = (ok, label, detail) => checks.push({ ok, label, detail });

try {
  await db.execute(sql`select 1`);
  record(true, "Database reachable");
} catch (error) {
  // drizzle wraps driver errors in a "Failed query" message that buries the
  // actual reason (bad host, wrong password, SSL refused), so unwrap it.
  console.error("\n  ✗ Could not connect to the database\n");
  console.error(`    ${error.cause?.message ?? error.message}\n`);
  console.error("    Check DATABASE_URL in back-end/database/.env — it is the");
  console.error("    Postgres connection string from Supabase → Project Settings");
  console.error("    → Database, with your database password filled in. It is not");
  console.error("    the anon key or the project URL.\n");
  process.exit(1);
}

// 1. Did prescription_migration.sql run?
const [{ present: pharmacyNameColumn }] = await rows(sql`
  select count(*)::int as present
  from information_schema.columns
  where table_name = 'pharmacies' and column_name = 'name'
`);

record(
  pharmacyNameColumn > 0,
  "prescription_migration.sql applied",
  "run back-end/database/src/db/prescription_migration.sql in Supabase"
);

// 2. Did seed.sql run?
if (pharmacyNameColumn > 0) {
  const [counts] = await rows(sql`
    select
      (select count(*)::int from medicines)          as medicines,
      (select count(*)::int from pharmacies)         as pharmacies,
      (select count(*)::int from pharmacy_inventory) as inventory
  `);

  record(
    counts.medicines > 0 && counts.pharmacies > 0 && counts.inventory > 0,
    `seed.sql applied  (${counts.medicines} medicines, ${counts.pharmacies} pharmacies, ${counts.inventory} inventory rows)`,
    "run back-end/database/src/db/seed.sql in Supabase"
  );
}

// 3. Is every pharmacist attached to a pharmacy?
const [pharmacists] = await rows(sql`
  select
    count(*)::int                                          as total,
    count(*) filter (where pharmacy_id is null)::int       as unlinked
  from pharmacist_profiles
`);

if (pharmacists.total === 0) {
  record(true, "No pharmacist accounts yet (sign one up to test the queue)");
} else {
  record(
    pharmacists.unlinked === 0,
    `Pharmacists linked to a pharmacy  (${pharmacists.total - pharmacists.unlinked}/${pharmacists.total})`,
    "run back-end/database/src/db/link_existing_pharmacists.sql"
  );
}

// 4. Are the other profiles there? Needed before any endpoint returns data.
const [profiles] = await rows(sql`
  select
    (select count(*)::int from doctor_profiles)  as doctors,
    (select count(*)::int from patient_profiles) as patients
`);

record(
  profiles.doctors > 0 && profiles.patients > 0,
  `Doctor and patient profiles exist  (${profiles.doctors} doctors, ${profiles.patients} patients)`,
  "sign up a doctor and a patient in the app — endpoints 403 without their profile row"
);

console.log("");
for (const check of checks) {
  console.log(`  ${check.ok ? "✓" : "✗"} ${check.label}`);
  if (!check.ok && check.detail) console.log(`      → ${check.detail}`);
}

const failed = checks.filter((check) => !check.ok).length;
console.log(failed ? `\n  ${failed} step(s) still to do.\n` : "\n  All set.\n");

process.exit(failed ? 1 : 0);

/** drizzle returns either an array or a {rows} result depending on the driver. */
async function rows(statement) {
  const result = await db.execute(statement);
  return Array.isArray(result) ? result : result.rows;
}
