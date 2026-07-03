"use client";

import { useActionState } from "react";
import { importData, type ActionState } from "@/app/actions";
import { useConfirm } from "./ConfirmProvider";
import { useLang } from "./LangProvider";

export function DataManager() {
  const { t } = useLang();
  const [state, action, pending] = useActionState<ActionState, FormData>(
    importData,
    undefined,
  );
  const confirm = useConfirm();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    const replace = (form.elements.namedItem("replace") as HTMLInputElement)
      ?.checked;
    if (replace) {
      e.preventDefault();
      const ok = await confirm({
        title: t("data.replaceTitle"),
        message: t("data.replaceMsg"),
        confirmLabel: t("data.replaceDo"),
        danger: true,
      });
      if (ok) form.requestSubmit();
    }
  }

  return (
    <section className="space-y-5">
      <h2 className="label">{t("data.title")}</h2>

      <div>
        <span className="label label-soft block mb-2">{t("data.export")}</span>
        <div className="flex flex-wrap gap-3">
          <a className="btn btn-ghost" href="/api/export?format=csv" download>
            {t("data.exportCsv")}
          </a>
          <a className="btn btn-ghost" href="/api/export?format=json" download>
            {t("data.exportJson")}
          </a>
        </div>
      </div>

      <form action={action} onSubmit={onSubmit} className="space-y-3">
        <span className="label label-soft block">{t("data.import")}</span>
        <input
          type="file"
          name="file"
          accept=".csv,.json,application/json,text/csv"
          required
          className="block w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-full file:border file:border-[color:var(--color-ink)] file:bg-transparent file:text-[color:var(--color-ink)] file:text-xs file:cursor-pointer"
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="replace" value="true" />
          {t("data.replace")}
        </label>

        {state?.error && (
          <p className="text-sm text-[color:var(--color-accent)]">
            {state.error}
          </p>
        )}
        {state?.ok && (
          <p className="text-sm text-[color:var(--color-ink-soft)]">
            {t("data.importedN", { n: state.count ?? 0 })}
          </p>
        )}

        <button className="btn" type="submit" disabled={pending}>
          {pending ? t("data.importing") : t("data.importButton")}
        </button>
      </form>

      <p className="label label-soft">{t("data.hint")}</p>
    </section>
  );
}
