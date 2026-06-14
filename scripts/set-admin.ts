/**
 * One-time admin provisioning / password reset script.
 *
 * Sets (or resets) an email+password credential on an existing user and
 * promotes them to admin. Works even if the user was originally created via
 * Google OAuth (which leaves them with no password credential).
 *
 * Usage:
 *   npx tsx scripts/set-admin.ts <email> <password>
 */
import 'dotenv/config';
import { randomUUID } from 'crypto';
import { eq, and } from 'drizzle-orm';
import { db } from '../src/db';
import { users, accounts } from '../src/db/schema';
import { auth } from '../lib/auth';

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Usage: npx tsx scripts/set-admin.ts <email> <password>');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (!user) {
    console.error(`No user found with email ${email}. Sign up first, then run this.`);
    process.exit(1);
  }

  // Hash the password using better-auth's own hasher (scrypt) for compatibility.
  const ctx = await auth.$context;
  const hashed = await ctx.password.hash(password);

  // Find an existing credential account for this user.
  const [existing] = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.userId, user.id), eq(accounts.providerId, 'credential')));

  if (existing) {
    await db
      .update(accounts)
      .set({ password: hashed, updatedAt: new Date() })
      .where(eq(accounts.id, existing.id));
    console.log('Updated existing password credential.');
  } else {
    await db.insert(accounts).values({
      id: randomUUID(),
      accountId: user.id,
      providerId: 'credential',
      userId: user.id,
      password: hashed,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log('Created new password credential.');
  }

  await db.update(users).set({ role: 'admin' }).where(eq(users.id, user.id));

  console.log(`\nDone. ${email} can now sign in with the given password and is an admin.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
