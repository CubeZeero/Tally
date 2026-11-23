"use client";

import { useEffect, useRef, useState } from "react";
import { useLang } from "../LangProvider";
import { SubIcon } from "../SubIcon";

async function fileToDataUrl(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  // Downscale to keep the stored data URL small.
  return new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const max = 128;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      c.getContext("2d")?.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL("image/png"));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export function IconPicker({
  icon,
  image,
  onIcon,
  onImage,
}: {
  icon: string;
  image: string;
  onIcon: (slug: string) => void;
  onImage: (dataUrl: string) => void;
}) {
  const { t } = useLang();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    { slug: string; title: string; hex: string }[]
  >([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/icons?q=${encodeURIComponent(query)}`);
        setResults(await res.json());
      } catch {
        setResults([]);
      }
    }, 200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query]);

  return (
    <div>
      <span className="label label-soft block mb-1">{t("dlg.icon")}</span>
      <div className="flex items-center gap-3">
        <span
          className="inline-flex items-center justify-center shrink-0 rounded-md border border-[color:var(--color-line)]"
          style={{ width: 38, height: 38 }}
        >
          <SubIcon icon={icon || null} image={image || null} color="#999" size={22} />
        </span>
        <input
          className="field flex-1"
          placeholder={t("dlg.iconSearch")}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {(icon || image) && (
          <button
            type="button"
            className="label label-soft hover:text-ink"
            onClick={() => {
              onIcon("");
              onImage("");
              setQuery("");
            }}
          >
            {t("dlg.iconClear")}
          </button>
        )}
      </div>

      {results.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2 max-h-28 overflow-y-auto">
          {results.map((r) => (
            <button
              key={r.slug}
              type="button"
              title={r.title}
              onClick={() => {
                onIcon(r.slug);
                onImage("");
                setQuery("");
                setResults([]);
              }}
              className="inline-flex items-center justify-center rounded-md border border-[color:var(--color-line)] hover:border-[color:var(--color-ink)]"
              style={{ width: 36, height: 36 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/icon/${encodeURIComponent(r.slug)}`}
                alt={r.title}
                width={22}
                height={22}
              />
            </button>
          ))}
        </div>
      )}

      <label className="label label-soft mt-2 inline-block cursor-pointer hover:text-ink">
        {t("dlg.iconImage")}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (f) {
              const url = await fileToDataUrl(f);
              onImage(url);
              onIcon("");
            }
          }}
        />
      </label>
    </div>
  );
}
