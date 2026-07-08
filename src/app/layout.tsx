import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { ConfirmProvider } from "@/components/ConfirmProvider";
import { LangProvider } from "@/components/LangProvider";
import { PwaRegister } from "@/components/PwaRegister";
import { getT, normalizeLang } from "@/lib/i18n";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const lang = normalizeLang((await cookies()).get("tally_lang")?.value);
  const t = getT(lang);
  return {
    title: t("app.title"),
    description: t("app.desc"),
    // Note: do NOT set `icons` here — that overrides Next's file-based icon
    // convention (app/icon.svg, app/apple-icon.png) and drops the favicon.
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, title: "Tally", statusBarStyle: "default" },
  };
}

export const viewport: Viewport = {
  themeColor: "#ff7a00",
};

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
        <PwaRegister />
      </body>
    </html>
  );
}
