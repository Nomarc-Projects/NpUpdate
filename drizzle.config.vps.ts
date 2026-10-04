import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: "postgresql://nomarc:.Adgjmptw14@nomarcproject-nomarcdb-kdg15z:5432/nomarcdb",
    ssl: false,
  },
});
