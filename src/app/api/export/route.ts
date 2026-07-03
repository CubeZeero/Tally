import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toCSV, toJSON } from "@/lib/data";

export async function GET(req: Request) {
  const userId = await getSession();
  if (!userId) {
    return new Response("unauthorized", { status: 401 });
  }

  const format = new URL(req.url).searchParams.get("format") === "csv" ? "csv" : "json";
  const subs = await prisma.subscription.findMany({
    where: { userId },
    orderBy: [{ active: "desc" }, { name: "asc" }],
  });

  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const filename = `tally-export-${stamp}.${format}`;

  const body = format === "csv" ? toCSV(subs) : toJSON(subs);
  const contentType =
    format === "csv" ? "text/csv; charset=utf-8" : "application/json; charset=utf-8";

  return new Response(body, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
