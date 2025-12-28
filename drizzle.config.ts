import { defineConfig } from "drizzle-kit";

export default defineConfig({
    dialect: "postgresql",
    schema: "./src/db/schema.ts", // <--- Make sure this path points to your schema file
    out: "./drizzle",
    dbCredentials: {
        url: process.env.DATABASE_URL!,
    },
    tablesFilter: ["!pg_stat_*"],
});