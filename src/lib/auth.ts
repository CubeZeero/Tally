import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma, seedUserDefaults } from "./db";

const COOKIE = "tally_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

// Placeholder values that must NOT be used as a real signing key.
const INSECURE_SECRETS = new Set([
  "",
  "tally-dev-secret-change-me-in-production-please",
  "change-me-to-a-long-random-string",
]);

let cachedSecret: Uint8Array | null = null;

function secret() {
  if (cachedSecret) return cachedSecret;
  let raw = (process.env.SESSION_SECRET ?? "").trim();
  if (INSECURE_SECRETS.has(raw)) {
    // Never fall back to a public/known constant — that would let anyone forge
    // sessions. Use an ephemeral random secret for this process instead.
    const bytes = new Uint8Array(32);
    globalThis.crypto.getRandomValues(bytes);
    raw = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    console.warn(
      "[auth] SESSION_SECRET is unset or a placeholder. Using a random per-process secret; " +
        "set a stable SESSION_SECRET to keep sessions valid across restarts.",
    );
  }
  cachedSecret = new TextEncoder().encode(raw);
  return cachedSecret;
}

export function normalizeUsername(v: string): string {
  return v.trim().toLowerCase();
}

/** True when at least one account exists. */
export async function anyUsers(): Promise<boolean> {
  return (await prisma.user.count()) > 0;
}

/**
 * Whether new sign-ups are allowed. The first account is always allowed so a
 * fresh instance can be set up; set DISABLE_REGISTRATION=1 to lock it after.
 */
export async function registrationAllowed(): Promise<boolean> {
  const disabled = ["1", "true", "yes"].includes(
    (process.env.DISABLE_REGISTRATION ?? "").toLowerCase(),
  );
  if (!disabled) return true;
  return !(await anyUsers()); // still allow creating the very first account
}

export async function createUser(
  username: string,
  password: string,
  lang = "en",
): Promise<{ id: string } | { error: "taken" }> {
  const name = normalizeUsername(username);
  const existing = await prisma.user.findUnique({ where: { username: name } });
  if (existing) return { error: "taken" };

  const isFirst = (await prisma.user.count()) === 0;
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    // username is normalized for lookups; displayName keeps the original case.
    data: { username: name, displayName: username.trim(), passwordHash, lang },
  });

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

  await seedUserDefaults(user.id, lang);
  return { id: user.id };
}

/** Persist the UI language cookie (used to render server components). */
export async function setLangCookie(lang: string) {
  const store = await cookies();
  store.set("tally_lang", lang === "ja" ? "ja" : "en", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
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
