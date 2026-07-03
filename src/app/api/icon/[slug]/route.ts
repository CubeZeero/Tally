import { iconSvg } from "@/lib/icons";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const url = new URL(req.url);
  const color = url.searchParams.get("color") ?? undefined;
  const svg = iconSvg(slug, color);
  if (!svg) {
    return new Response("not found", { status: 404 });
  }
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
