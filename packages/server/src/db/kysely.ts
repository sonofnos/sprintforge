import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import type { Database } from "./types.js";
import { env } from "../env.js";

export function createDb(connectionString: string = env.databaseUrl): Kysely<Database> {
  return new Kysely<Database>({
    dialect: new PostgresDialect({
      pool: new Pool({ connectionString, max: 10 }),
    }),
  });
}

export const db = createDb();
