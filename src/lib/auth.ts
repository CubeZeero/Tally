import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma, seedUserDefaults } from "./db";

const COOKIE = "tally_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function secret() {
  const raw =
    process.env.SESSION_SECRET ||
    "tally-dev-secret-change-me-in-production-please";
  return new TextEncoder().encode(raw);
}

export function normalizeUsername(v: string): string {
  return v.trim().toLowerCase();
}

/** True when at least one account exists. */
export async function anyUsers(): Promise<boolean> {
  return (await prisma.user.count()) > 0;
}

export async function createUser(
  username: string,
  password: string,
): Promise<{ id: string } | { error: "taken" }> {
  const name = normalizeUsername(username);
  const existing = await prisma.user.findUnique({ where: { username: name } });
  if (existing) return { error: "taken" };

  const isFirst = (await prisma.user.count()) === 0;
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({ data: { username: name, passwordHash } });

  // The very first account claims any pre-multi-user (orphaned) data.
  if (isFirst) {
    await prisma.subscription.updateMany({
      where: { userId: null },
      data: { userId: user.id },
    });
    await prisma.category.updateMany({
      where: { userId: null },
      data: { userId: user.id },
    });
    await prisma.paymentMethod.updateMany({
      where: { userId: null },
      data: { userId: user.id },
    });
  }

  await seedUserDefaults(user.id);
  return { id: user.id };
}

export async function verifyLogin(
  username: string,
  password: string,
): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { username: normalizeUsername(username) },
  });
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  return ok ? user.id : null;
}

export async function setUserPassword(userId: string, password: string) {
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

export async function createSession(userId: string) {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());

  // Only mark Secure when the request actually came over HTTPS, so plain-HTTP
  // self-hosting (e.g. a Tailscale IP) does not drop the cookie.
  const h = await headers();
  const proto = h.get("x-forwarded-proto")?.split(",")[0].trim();
  const secure = proto === "https";

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE);
}

/** Returns the authenticated userId, or null. */
export async function getSession(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const userId = typeof payload.sub === "string" ? payload.sub : null;
    if (!userId) return null;
    // Ensure the user still exists.
    const exists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    return exists ? userId : null;
  } catch {
    return null;
  }
}

/** Use inside protected server components / actions. Returns the userId. */
export async function requireAuth(): Promise<string> {
  const userId = await getSession();
  if (userId) return userId;
  redirect((await anyUsers()) ? "/login" : "/register");
}
