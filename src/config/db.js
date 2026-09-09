import { drizzle } from "drizzle-orm/node-postgres";
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from "dotenv";
dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy it from Supabase → Project Settings → Database → Connection string, and put it in back-end/database/.env"
  );
}

/**
 * Supabase only accepts SSL connections, but node-postgres defaults to plain
 * TCP — without this the first query fails with a pg_hba.conf error rather than
 * anything that names SSL. Local Postgres is left alone, and an explicit
 * sslmode in the URL wins so it stays overridable.
 */
const isLocal = /@(localhost|127\.0\.0\.1)[:/]/.test(connectionString);
const hasExplicitSslMode = /[?&]sslmode=/.test(connectionString);

const pool = new Pool({
  connectionString,
  ...(!isLocal && !hasExplicitSslMode
    ? // Supabase serves a certificate signed by a CA that is not in Node's
      // default trust store, so verification has to be relaxed.
      { ssl: { rejectUnauthorized: false } }
    : {}),
});

const db = drizzle(pool);
export default db;
