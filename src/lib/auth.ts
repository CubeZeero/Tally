import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import { hashApiToken } from "@/lib/token-hash";
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

/**
 * Derive separate signing keys for browser sessions and MCP access tokens.
 */
async function signingKey(purpose: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", new Uint8Array(secret()),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign(
    "HMAC", key, new TextEncoder().encode(`tally:v2:${purpose}`),
  ));
}

export function oauthSigningKey() {
  return signingKey("mcp-access");
}

/** True when at least one account exists. */
export async function anyUsers(): Promise<boolean> {
  return (await prisma.user.count()) > 0;
}

function openRegistration() {
  return ["0", "false", "no"].includes((process.env.DISABLE_REGISTRATION ?? "1").trim().toLowerCase());
}

/** The first account remains available for setup. */
export async function registrationAllowed(): Promise<boolean> {
  return openRegistration() || !(await anyUsers());
}

export async function createUser(
  username: string,
  password: string,
  lang = "en",
): Promise<{ id: string } | { error: "taken" | "closed" }> {
  const name = normalizeUsername(username);
  const passwordHash = await bcrypt.hash(password, 10);
  const currency = lang === "en" ? "USD" : "JPY";

  const result = await prisma.$transaction(async (tx) => {
    const isFirst = (await tx.user.count()) === 0;
    if (!isFirst && !openRegistration()) return { error: "closed" } as const;
    if (await tx.user.findUnique({ where: { username: name }, select: { id: true } })) {
      return { error: "taken" } as const;
    }
    const user = await tx.user.create({
      data: { username: name, displayName: username.trim(), passwordHash, lang, currency },
      select: { id: true },
    });

    if (isFirst) {
      const where = { userId: null };
      const data = { userId: user.id };
      await tx.subscription.updateMany({ where, data });
      await tx.category.updateMany({ where, data });
      await tx.paymentMethod.updateMany({ where, data });
    }
    return user;
  });
  if ("id" in result) await seedUserDefaults(result.id, lang);
  return result;
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
    .setProtectedHeader({ alg: "HS256", typ: "tally-session+jwt" })
    .setIssuer("tally").setAudience("tally-web")
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(await signingKey("web-session"));

  // Only mark Secure when the request actually came over HTTPS, so plain-HTTP
  // self-hosting (e.g. a Tailscale IP) does not drop the cookie.
  const h = await headers();
  const proto = h.get("x-forwarded-proto")?.split(",")[0].trim();
  const secure = process.env.TALLY_PUBLIC_URL?.startsWith("https://") || proto === "https";

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
    const { payload } = await jwtVerify(token, await signingKey("web-session"), {
      algorithms: ["HS256"], typ: "tally-session+jwt", issuer: "tally",
      audience: "tally-web", requiredClaims: ["sub", "iat", "exp"],
    });
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

/**
 * Resolve a bearer API key to a userId. Cookie-independent, so it works outside
 * a Next request context (e.g. the MCP endpoint). Returns null for a missing,
 * blank, too-short, or unknown key. Only its hash is stored.
 */
export async function getUserIdByApiKey(
  key: string | null | undefined,
): Promise<string | null> {
  const token = (key ?? "").trim();
  if (token.length < 16 || token.length > 128) return null; // reject blanks / obviously invalid keys
  const user = await prisma.user.findUnique({
    where: { apiKey: hashApiToken(token) },
    select: { id: true },
  });
  return user?.id ?? null;
}

/** Use inside protected server components / actions. Returns the userId. */
export async function requireAuth(): Promise<string> {
  const userId = await getSession();
  if (userId) return userId;
  redirect((await anyUsers()) ? "/login" : "/register");
}
