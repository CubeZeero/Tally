import type { ReactNode } from "react";

/**
 * On/off toggle rendered as a styled checkbox, so it submits natively inside a
 * form (value "true" when on). Label on the left, switch on the right.
 */
export function Switch({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: ReactNode;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer text-sm">
      <span>{label}</span>
      <input
        type="checkbox"
        name={name}
        value="true"
        defaultChecked={defaultChecked}
        className="tally-switch"
      />
    </label>
  );
}
