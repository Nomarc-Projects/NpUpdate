import { defineConfig } from "drizzle-kit";

// `drizzle-kit generate` only needs the schema (no DB connection) — we apply the
// generated SQL ourselves so we never touch Better Auth's existing tables.
export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
});
