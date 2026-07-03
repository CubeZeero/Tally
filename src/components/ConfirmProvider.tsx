"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type Pending = { opts: ConfirmOptions; resolve: (ok: boolean) => void };

const ConfirmContext = createContext<(o: ConfirmOptions) => Promise<boolean>>(
  () => Promise.resolve(false),
);

export function useConfirm() {
  return useContext(ConfirmContext);
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setPending({ opts, resolve })),
    [],
  );

  const close = useCallback(
    (result: boolean) => {
      pending?.resolve(result);
      setPending(null);
    },
    [pending],
  );

  useEffect(() => {
    if (!pending) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close(false);
      if (e.key === "Enter") close(true);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pending, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {pending && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          role="alertdialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => close(false)}
          />
          <div className="relative w-full max-w-sm bg-[color:var(--color-paper)] border border-[color:var(--color-line)] rounded-2xl p-6 float-in">
            {pending.opts.title && (
              <h2 className="headline text-xl mb-2">{pending.opts.title}</h2>
            )}
            <p className="text-sm text-[color:var(--color-ink-soft)] leading-relaxed whitespace-pre-line">
              {pending.opts.message}
            </p>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                autoFocus
                onClick={() => close(true)}
                className="btn flex-1"
                style={
                  pending.opts.danger
                    ? {
                        background: "var(--color-accent)",
                        borderColor: "var(--color-accent)",
                        color: "#fff",
                      }
                    : undefined
                }
              >
                {pending.opts.confirmLabel ?? "OK"}
              </button>
              <button
                type="button"
                onClick={() => close(false)}
                className="btn btn-ghost"
              >
                {pending.opts.cancelLabel ?? "キャンセル"}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
