import { redirect } from "next/navigation";
import { AuthScreen } from "@/components/AuthScreen";
import { register } from "@/app/actions";
import { getSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  if (await getSession()) redirect("/");
  return <AuthScreen mode="register" action={register} />;
}
