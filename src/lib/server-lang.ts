import "server-only";
import { cookies } from "next/headers";
import { getT, normalizeLang, type Lang, type TFunc } from "./i18n";

export async function getLang(): Promise<Lang> {
  return normalizeLang((await cookies()).get("tally_lang")?.value);
}

export async function serverT(): Promise<{ lang: Lang; t: TFunc }> {
  const lang = await getLang();
  return { lang, t: getT(lang) };
}
