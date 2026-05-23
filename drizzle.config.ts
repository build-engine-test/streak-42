import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // drizzle-kit needs a URL at generate time only for introspection paths
    // we do not use; provide a harmless placeholder when not set so the CLI
    // does not throw before we even ask it to write SQL.
    url: databaseUrl ?? "postgres://placeholder:placeholder@localhost:5432/placeholder",
  },
  strict: true,
  verbose: false,
});
