/**
 * Applies pending SQL migrations from ./drizzle to the configured database.
 * Run with: npm run db:migrate
 */
import { getDb } from "./index";

async function main() {
  // getDb() runs migrations for PGlite automatically; for Postgres we force it.
  process.env.DB_AUTO_MIGRATE = "true";
  await getDb();
  console.log("✓ Migrations applied");
  process.exit(0);
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
