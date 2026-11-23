"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { updateSettings, type ActionState } from "@/app/actions";

type SaveStatus =
  | { state: "idle" | "saving" | "saved"; error?: never }
  | { state: "error"; error: string };

export function useSettingsAutosave(fallbackError: string) {
  const formRef = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queue = useRef<Promise<ActionState>>(Promise.resolve(undefined));
  const revision = useRef(0);
  const [status, setStatus] = useState<SaveStatus>({ state: "idle" });

  function cancelTimer() {
    if (timer.current === null) return false;
    clearTimeout(timer.current);
    timer.current = null;
    return true;
  }

  useEffect(() => () => {
    if (timer.current !== null) clearTimeout(timer.current);
    revision.current++;
  }, []);

  function save(): Promise<ActionState> {
    cancelTimer();
    const form = formRef.current;
    if (!form) return Promise.resolve(undefined);
    const body = new FormData(form);
    body.delete("password");
    const current = ++revision.current;
    setStatus({ state: "saving" });

    const pending = queue.current.then(async () => {
      const result = await updateSettings(undefined, body).catch(() => ({ error: fallbackError }));
      if (current === revision.current) {
        setStatus(result?.error ? { state: "error", error: result.error } : { state: "saved" });
      }
      return result;
    });
    queue.current = pending;
    return pending;
  }

  function onFormChange(event: FormEvent<HTMLFormElement>) {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.name === "password") return;
    cancelTimer();
    const immediate = target instanceof HTMLSelectElement ||
      (target instanceof HTMLInputElement && ["checkbox", "radio"].includes(target.type));
    if (immediate) void save();
    else timer.current = setTimeout(() => void save(), 700);
  }

  function onFormBlur() {
    if (timer.current !== null) void save();
  }

  return { formRef, status, save, onFormChange, onFormBlur };
}
