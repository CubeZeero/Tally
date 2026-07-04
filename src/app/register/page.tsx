import { redirect } from "next/navigation";
import { AuthScreen } from "@/components/AuthScreen";
import { register } from "@/app/actions";
import { getSession, registrationAllowed } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  if (await getSession()) redirect("/");
  if (!(await registrationAllowed())) redirect("/login");
  return <AuthScreen mode="register" action={register} />;
}
