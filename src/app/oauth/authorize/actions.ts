"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  originFromHeaders,
  randomToken,
  grantScopes,
  CODE_TTL_SEC,
} from "@/lib/oauth";

function withParams(base: string, params: Record<string, string>): string {
  const u = new URL(base);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return u.toString();
}

async function allowedRedirect(clientId: string, redirectUri: string): Promise<boolean> {
  const client = await prisma.oAuthClient.findUnique({ where: { id: clientId } });
  if (!client) return false;
  try {
    return (JSON.parse(client.redirectUris) as string[]).includes(redirectUri);
  } catch {
    return false;
  }
}

/** User approved: mint a single-use authorization code and redirect back. */
export async function approveAuthorization(formData: FormData) {
  const clientId = String(formData.get("client_id") ?? "");
  const redirectUri = String(formData.get("redirect_uri") ?? "");
  const codeChallenge = String(formData.get("code_challenge") ?? "");
  const state = String(formData.get("state") ?? "");
  const scope = grantScopes(String(formData.get("scope") ?? ""));
  const authorizeUrl = String(formData.get("authorize_url") ?? "/");

  const userId = await getSession();
  if (!userId) redirect(`/login?next=${encodeURIComponent(authorizeUrl)}`);

  if (!(await allowedRedirect(clientId, redirectUri))) redirect("/");

  const resource = `${originFromHeaders(await headers())}/api/mcp`;
  const code = randomToken(32);
  await prisma.oAuthAuthCode.create({
    data: {
      code,
      clientId,
      userId,
      redirectUri,
      codeChallenge,
      scope,
      resource,
      expiresAt: new Date(Date.now() + CODE_TTL_SEC * 1000),
    },
  });

  redirect(withParams(redirectUri, state ? { code, state } : { code }));
}

/** User denied: bounce back with an OAuth error. */
export async function denyAuthorization(formData: FormData) {
  const clientId = String(formData.get("client_id") ?? "");
  const redirectUri = String(formData.get("redirect_uri") ?? "");
  const state = String(formData.get("state") ?? "");
  if (!(await allowedRedirect(clientId, redirectUri))) redirect("/");
  redirect(
    withParams(redirectUri, state ? { error: "access_denied", state } : { error: "access_denied" }),
  );
}
