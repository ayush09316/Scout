import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { sql?: ReturnType<typeof postgres> };

// Serverless: every warm instance holds its own pool, so keep it tiny and release idle
// connections fast. In prod DATABASE_URL should be Supabase's transaction pooler (:6543).
const isProd = process.env.NODE_ENV === "production";
const sql = globalForDb.sql ?? postgres(process.env.DATABASE_URL ?? "postgres://localhost:5432/scout", {
  max: isProd ? 3 : 5,
  idle_timeout: 20,
  max_lifetime: 60 * 5,
  prepare: false,
});
if (!isProd) globalForDb.sql = sql;

export const db = drizzle(sql, { schema });
export const rawSql = sql;
export { schema };
