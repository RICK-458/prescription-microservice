/**
 * Applies a SQL file from this folder against DATABASE_URL.
 *
 *   npm run db:apply prescription_migration.sql
 *   npm run db:apply seed.sql
 *
 * Each file is sent as a single multi-statement query inside a transaction, so
 * a failure part-way through leaves the database untouched rather than
 * half-migrated.
 */
import "dotenv/config";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pkg from "pg";

const { Client } = pkg;

const file = process.argv[2];

if (!file) {
  console.error("\n  Usage: npm run db:apply <file.sql>\n");
  console.error("  Available:");
  console.error("    prescription_migration.sql");
  console.error("    seed.sql");
  console.error("    link_existing_pharmacists.sql\n");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("\n  DATABASE_URL is not set in back-end/database/.env\n");
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const path = join(here, file);

let sql;
try {
  sql = await readFile(path, "utf8");
} catch {
  console.error(`\n  No such file: ${path}\n`);
  process.exit(1);
}

const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL);
const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ...(isLocal ? {} : { ssl: { rejectUnauthorized: false } }),
});

await client.connect();

try {
  await client.query("begin");
  const results = await client.query(sql);
  await client.query("commit");

  console.log(`\n  ✓ Applied ${file}\n`);

  // Files that end in SELECTs (the pharmacist backfill) report what they found.
  for (const result of [].concat(results)) {
    if (result.command === "SELECT" && result.rows.length) {
      console.table(result.rows);
    }
  }
} catch (error) {
  await client.query("rollback").catch(() => {});
  console.error(`\n  ✗ ${file} failed — nothing was changed\n`);
  console.error(`    ${error.message}\n`);
  if (error.hint) console.error(`    hint: ${error.hint}\n`);
  process.exitCode = 1;
} finally {
  await client.end();
}
