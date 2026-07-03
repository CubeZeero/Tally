/* eslint-disable @next/next/no-img-element */

/**
 * Renders a subscription's icon in a fixed-size box so rows stay aligned
 * whether or not an icon/image is set. Priority: custom image → brand icon → dot.
 */
export function SubIcon({
  icon,
  image,
  color,
  size = 22,
}: {
  icon?: string | null;
  image?: string | null;
  color: string;
  size?: number;
}) {
  return (
    <span
      className="inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      {image ? (
        <img
          src={image}
          alt=""
          width={size}
          height={size}
          className="rounded-[6px] object-cover"
          style={{ width: size, height: size }}
          loading="lazy"
        />
      ) : icon ? (
        <img
          src={`/api/icon/${encodeURIComponent(icon)}`}
          alt=""
          width={size}
          height={size}
          loading="lazy"
        />
      ) : (
        <span
          className="rounded-full"
          style={{ width: size * 0.5, height: size * 0.5, background: color }}
        />
      )}
    </span>
  );
}
