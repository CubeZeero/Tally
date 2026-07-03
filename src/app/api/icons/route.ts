import { searchIcons } from "@/lib/icons";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  const results = searchIcons(q, 24).map((i) => ({
    slug: i.slug,
    title: i.title,
    hex: i.hex,
  }));
  return Response.json(results);
}
