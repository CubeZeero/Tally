"use client";

import { useState, useTransition } from "react";
import { PlugsConnected } from "@phosphor-icons/react/dist/ssr";
import { generateApiKey, revokeApiKey, setRestWriteApiKey } from "@/app/actions";
import { useLang } from "./LangProvider";

export function McpKeyManager({
  hasApiKey,
  hasRestWriteKey,
  mcpUrl,
}: {
  hasApiKey: boolean;
  hasRestWriteKey: boolean;
  mcpUrl: string;
}) {
  const { t } = useLang();
  const [pending, start] = useTransition();
  const [issued, setIssued] = useState<{ write: boolean; key: string } | null>(null);

  function generate(write: boolean) {
    start(async () => {
      const { key } = write ? await setRestWriteApiKey(true) : await generateApiKey();
      setIssued(key ? { write, key } : null);
    });
  }

  function revoke(write: boolean) {
    start(async () => {
      await (write ? setRestWriteApiKey(false) : revokeApiKey());
      setIssued((saved) => saved?.write === write ? null : saved);
    });
  }

  return (
    <section className="card p-6 space-y-4">
      <h2 className="label flex items-center gap-2">
        <PlugsConnected size={16} /> {t("set.mcp")}
      </h2>
      <p className="label label-soft">{t("set.mcpNote")}</p>
      <label className="block">
        <span className="label label-soft">{t("set.mcpEndpoint")}</span>
        <input className="field w-full font-mono text-sm" readOnly value={mcpUrl}
          onFocus={(event) => event.currentTarget.select()} />
      </label>
      {[false, true].map((write) => {
        const exists = write ? hasRestWriteKey : hasApiKey;
        const label = t(write ? "set.restWrite" : "set.mcpReadKey");
        return (
          <div key={String(write)} className="space-y-2 border-t border-[color:var(--color-line)] pt-3">
            <h3 className="label">{label}</h3>
            <p className="text-sm">{t(write ? "set.restWriteNote" : "set.mcpReadNote")}</p>
            {issued?.write === write && (
              <label className="block">
                <span className="label label-soft">{t("set.mcpCopyOnce")}</span>
                <input className="field w-full font-mono text-sm" readOnly value={issued.key}
                  onFocus={(event) => event.currentTarget.select()} />
              </label>
            )}
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn btn-ghost" disabled={pending} onClick={() => generate(write)}>
                {t(exists ? "set.mcpRotate" : "set.mcpGenerate")}
              </button>
              {exists && (
                <button type="button" className="btn btn-ghost" disabled={pending} onClick={() => revoke(write)}>
                  {t("set.mcpRevoke")}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
