import { redirect } from "next/navigation";
import { AuthScreen } from "@/components/AuthScreen";
import { login } from "@/app/actions";
import { anyUsers, getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Only allow same-origin relative paths as a post-login destination. */
function safeNext(v: string | string[] | undefined): string {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.startsWith("/") && !s.startsWith("//") ? s : "/";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const next = safeNext((await searchParams).next);
  if (!(await anyUsers())) redirect("/register");
  if (await getSession()) redirect(next);
  return <AuthScreen mode="login" action={login} next={next} />;
}
