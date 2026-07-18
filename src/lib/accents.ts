// Accent color presets. `key` matches the data-accent selectors in globals.css;
// `color` is the swatch shown in the picker (light-mode value).
export const ACCENTS = [
  { key: "orange", color: "#ff7a00" },
  { key: "red", color: "#e23b3b" },
  { key: "pink", color: "#e0479b" },
  { key: "purple", color: "#7c4dff" },
  { key: "blue", color: "#2f6bff" },
  { key: "teal", color: "#0d9488" },
  { key: "green", color: "#1f9d55" },
] as const;

export const ACCENT_KEYS: string[] = ACCENTS.map((a) => a.key);
export const DEFAULT_ACCENT = "orange";
