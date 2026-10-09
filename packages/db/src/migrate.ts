import { migrate } from "drizzle-orm/node-postgres/migrator";
import { fileURLToPath } from "node:url";
import { createDb } from "./client";

export async function runMigrations(url = process.env.DATABASE_URL): Promise<void> {
  const handle = createDb(url);
  try {
    await migrate(handle.db, { migrationsFolder: fileURLToPath(new URL("../migrations", import.meta.url)) });
  } finally {
    await handle.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then(() => console.log("migrations applied"))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
