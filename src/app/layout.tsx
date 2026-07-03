import type { Metadata } from "next";
import { cookies } from "next/headers";
import { ConfirmProvider } from "@/components/ConfirmProvider";
import { LangProvider } from "@/components/LangProvider";
import { getT, normalizeLang } from "@/lib/i18n";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const lang = normalizeLang((await cookies()).get("tally_lang")?.value);
  const t = getT(lang);
  return { title: t("app.title"), description: t("app.desc") };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const store = await cookies();
  const theme = store.get("tally_theme")?.value === "dark" ? "dark" : "light";
  const lang = normalizeLang(store.get("tally_lang")?.value);
  return (
    <html lang={lang} data-theme={theme}>
      <body>
        <LangProvider lang={lang}>
          <ConfirmProvider>{children}</ConfirmProvider>
        </LangProvider>
      </body>
    </html>
  );
}
