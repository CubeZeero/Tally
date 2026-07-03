"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "./ConfirmProvider";
import { useLang } from "./LangProvider";

export type Item = { id: string; name: string };

export function ListManager({
  title,
  items,
  addAction,
  deleteAction,
}: {
  title: string;
  items: Item[];
  addAction: (formData: FormData) => Promise<void>;
  deleteAction: (id: string) => Promise<void>;
}) {
  const router = useRouter();
  const { t } = useLang();
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const confirm = useConfirm();

  return (
    <section className="space-y-3">
      <h2 className="label">{title}</h2>

      <div className="flex flex-wrap gap-2">
        {items.length === 0 && (
          <span className="text-sm text-[color:var(--color-ink-soft)]">
            {t("list.empty")}
          </span>
        )}
        {items.map((it) => (
          <span key={it.id} className="chip">
            {it.name}
            <button
              type="button"
              aria-label={`${it.name} を削除`}
              disabled={pending}
              onClick={async () => {
                const ok = await confirm({
                  title: t("list.deleteTitle", { title }),
                  message: t("list.deleteMsg", { name: it.name }),
                  confirmLabel: t("common.deleteDo"),
                  danger: true,
                });
                if (ok) {
                  start(async () => {
                    await deleteAction(it.id);
                    router.refresh();
                  });
                }
              }}
            >
              ✕
            </button>
          </span>
        ))}
      </div>

      <form
        ref={formRef}
        action={(fd) =>
          start(async () => {
            await addAction(fd);
            formRef.current?.reset();
            router.refresh();
          })
        }
        className="flex items-center gap-3"
      >
        <input
          className="field flex-1"
          name="name"
          placeholder={t("list.addNew")}
          required
        />
        <button className="btn btn-ghost" type="submit" disabled={pending}>
          {t("list.add")}
        </button>
      </form>
    </section>
  );
}
