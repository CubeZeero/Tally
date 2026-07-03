import { redirect } from "next/navigation";
import { AuthScreen } from "@/components/AuthScreen";
import { login } from "@/app/actions";
import { anyUsers, getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (!(await anyUsers())) redirect("/register");
  if (await getSession()) redirect("/");
  return <AuthScreen mode="login" action={login} />;
}
