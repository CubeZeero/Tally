import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { originFromHeaders, grantScopes, isAllowedRedirectUri, isPkceChallenge } from "@/lib/oauth";
import { serverT } from "@/lib/server-lang";
import { approveAuthorization, denyAuthorization } from "./actions";

export const dynamic = "force-dynamic";

function first(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

function safeParse(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function withParams(base: string, params: Record<string, string>): string {
  const u = new URL(base);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  return u.toString();
}

export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const responseType = first(sp.response_type);
  const clientId = first(sp.client_id);
  const redirectUri = first(sp.redirect_uri);
  const codeChallenge = first(sp.code_challenge);
  const codeChallengeMethod = first(sp.code_challenge_method);
  const state = first(sp.state);

  const { t } = await serverT();

  // Validate client + redirect_uri before trusting any redirect back.
  const client = clientId
    ? await prisma.oAuthClient.findUnique({ where: { id: clientId } })
    : null;
  const registered = client ? safeParse(client.redirectUris) : [];
  const redirectOk = isAllowedRedirectUri(redirectUri) && registered.includes(redirectUri);

  if (!client || !redirectOk) {
    return (
      <main className="min-h-screen grid place-items-center px-6">
        <section className="card p-8 max-w-md w-full space-y-2 text-center">
          <h1 className="headline text-2xl">{t("oauth.err.title")}</h1>
          <p className="label label-soft">{t("oauth.err.client")}</p>
        </section>
      </main>
    );
  }

  // redirect_uri is now trusted → OAuth protocol errors bounce back to the client.
  if (responseType !== "code") {
    redirect(withParams(redirectUri, state ? { error: "unsupported_response_type", state } : { error: "unsupported_response_type" }));
  }
  if (!isPkceChallenge(codeChallenge) || codeChallengeMethod !== "S256") {
    redirect(withParams(redirectUri, state ? { error: "invalid_request", state } : { error: "invalid_request" }));
  }

  // Rebuild the full authorize URL (login return target + form state).
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    const val = first(v);
    if (val) qs.set(k, val);
  }
  const authorizeUrl = `/oauth/authorize?${qs.toString()}`;

  const userId = await getSession();
  if (!userId) redirect(`/login?next=${encodeURIComponent(authorizeUrl)}`);
  const user = await prisma.user.findUnique({ where: { id: userId } });

  const appName = client.clientName || t("oauth.defaultClient");
  const scope = grantScopes(first(sp.scope));
  const grantedScopes = scope.split(" ");
  const hidden = (
    <>
      <input type="hidden" name="client_id" value={clientId} />
      <input type="hidden" name="redirect_uri" value={redirectUri} />
      <input type="hidden" name="code_challenge" value={codeChallenge} />
      <input type="hidden" name="state" value={state} />
      <input type="hidden" name="scope" value={scope} />
      <input type="hidden" name="authorize_url" value={authorizeUrl} />
    </>
  );

  return (
    <main className="min-h-screen grid place-items-center px-6 py-12">
      <section className="card p-8 max-w-md w-full space-y-6">
        <div className="space-y-2 text-center">
          <p className="label label-soft">{t("oauth.eyebrow")}</p>
          <h1 className="headline text-2xl">{t("oauth.title", { app: appName })}</h1>
        </div>

        <p className="label label-soft">{t("oauth.desc", { app: appName })}</p>

        <div className="space-y-1">
          <p className="label label-soft">{t("oauth.account")}</p>
          <p className="font-medium">{user?.displayName || user?.username}</p>
        </div>

        <div className="space-y-1">
          <p className="label label-soft">{t("oauth.permissions")}</p>
          <ul className="list-disc list-inside text-sm">
            {grantedScopes.includes("tally:read") && <li>{t("oauth.scope.read")}</li>}
            {grantedScopes.includes("tally:write") && <li>{t("oauth.scope.write")}</li>}
          </ul>
        </div>

        <div className="flex gap-3">
          <form action={approveAuthorization} className="flex-1">
            {hidden}
            <button type="submit" className="btn btn-primary w-full">
              {t("oauth.approve")}
            </button>
          </form>
          <form action={denyAuthorization} className="flex-1">
            {hidden}
            <button type="submit" className="btn btn-ghost w-full">
              {t("oauth.deny")}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
