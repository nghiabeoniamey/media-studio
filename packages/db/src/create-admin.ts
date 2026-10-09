import { eq } from "drizzle-orm";
import { hashPassword } from "./auth";
import { createDb } from "./client";
import { users } from "./schema";

/** Usage: ADMIN_PASSWORD=... pnpm --filter @media-studio/db create-admin you@example.com "Your Name" */
async function main() {
  const [email, name] = process.argv.slice(2);
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !name || !password) {
    throw new Error('usage: ADMIN_PASSWORD=... create-admin <email> "<name>"');
  }
  const handle = createDb();
  try {
    const passwordHash = await hashPassword(password);
    const [existing] = await handle.db.select({ id: users.id }).from(users).where(eq(users.email, email.toLowerCase()));
    if (existing) {
      await handle.db.update(users).set({ passwordHash, role: "admin", active: true }).where(eq(users.id, existing.id));
      console.log(`updated admin ${email}`);
    } else {
      await handle.db.insert(users).values({ email: email.toLowerCase(), name, passwordHash, role: "admin" });
      console.log(`created admin ${email}`);
    }
  } finally {
    await handle.close();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
