"use client";

import { useState, useTransition } from "react";
import { PlugsConnected } from "@phosphor-icons/react/dist/ssr";
import { generateApiKey, revokeApiKey, setRestWriteApiKey } from "@/app/actions";
import { useLang } from "./LangProvider";

// Settings card to generate / revoke the per-user MCP API key. It powers two
// connection styles: a token-in-URL "connector URL" (claude.ai / Desktop custom
// connector, which has no header field) and the endpoint + bearer key (Claude
// Code / mcp-remote).
export function McpKeyManager({
  apiKey,
  mcpUrl,
  restWriteKey,
}: {
  apiKey: string | null;
  mcpUrl: string;
  restWriteKey: string | null;
}) {
  const { t } = useLang();
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState<"connector" | "url" | "key" | null>(null);

  const copy = (text: string, which: "connector" | "url" | "key") => {
    navigator.clipboard?.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 1500);
  };

  const connectorUrl = apiKey ? `${mcpUrl}/${apiKey}` : null;

  return (
    <section className="card p-6 space-y-3">
      <h2 className="label flex items-center gap-2">
        <PlugsConnected size={16} /> {t("set.mcp")}
      </h2>
      <p className="label label-soft">{t("set.mcpNote")}</p>

      {connectorUrl ? (
        <>
          {/* 1. OAuth — plain endpoint; the client discovers OAuth and signs in. */}
          <label className="label label-soft">{t("set.mcpOAuth")}</label>
          <div className="flex items-center gap-2">
            <input className="field flex-1 font-mono text-sm" readOnly value={mcpUrl} />
            <button
              type="button"
              className="btn btn-ghost shrink-0"
              onClick={() => copy(mcpUrl, "url")}
            >
              {copied === "url" ? t("common.copied") : t("set.mcpCopyUrl")}
            </button>
          </div>

          {/* 2. Token-in-URL — for connectors with no auth field. */}
          <label className="label label-soft">{t("set.mcpConnectorUrl")}</label>
          <div className="flex items-center gap-2">
            <input className="field flex-1 font-mono text-sm" readOnly value={connectorUrl} />
            <button
              type="button"
              className="btn btn-ghost shrink-0"
              onClick={() => copy(connectorUrl, "connector")}
            >
              {copied === "connector" ? t("common.copied") : t("set.mcpCopyUrl")}
            </button>
          </div>

          {/* 3. Bearer API key — for Claude Code / mcp-remote. */}
          <label className="label label-soft">{t("set.mcpBearer")}</label>
          <div className="flex items-center gap-2">
            <input className="field flex-1 font-mono text-sm" readOnly value={apiKey ?? ""} />
            <button
              type="button"
              className="btn btn-ghost shrink-0"
              onClick={() => copy(apiKey ?? "", "key")}
            >
              {copied === "key" ? t("common.copied") : t("set.mcpCopyKey")}
            </button>
          </div>

          <button
            type="button"
            className="btn btn-ghost"
            disabled={pending}
            onClick={() => start(async () => void (await revokeApiKey()))}
          >
            {pending ? "…" : t("set.mcpRevoke")}
          </button>
        </>
      ) : (
        <button
          type="button"
          className="btn btn-ghost"
          disabled={pending}
          onClick={() => start(async () => void (await generateApiKey()))}
        >
          {pending ? "…" : t("set.mcpGenerate")}
        </button>
      )}
      <div className="space-y-2 border-t border-[color:var(--color-line)] pt-3">
        <h3 className="label">{t("set.restWrite")}</h3>
        <p className="text-sm text-muted">{t("set.restWriteNote")}</p>
        {restWriteKey && (
          <input className="field w-full font-mono text-sm" aria-label={t("set.restWrite")}
            readOnly value={restWriteKey} onFocus={(event) => event.currentTarget.select()} />
        )}
        <button type="button" className="btn btn-ghost" disabled={pending}
          onClick={() => start(async () => void (await setRestWriteApiKey(!restWriteKey)))}>
          {restWriteKey ? t("set.mcpRevoke") : t("set.mcpGenerate")}
        </button>
      </div>
    </section>
  );
}
