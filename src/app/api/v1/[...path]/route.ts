import { getUserIdByApiKey } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  groupField, labelCreate, labelDelete, labelName, labelRename, previewInput,
  rangeInput, reminderFields, searchInput,
} from "@/lib/services/integration-input";
import { changeSubscriptionLabel } from "@/lib/services/subscription-labels";
import { previewSubscriptionImport } from "@/lib/services/import-preview";
import { createInput, patchInput } from "@/lib/services/rest-subscription-input";
import {
  createSubscription,
  subscriptionWriteDefaults,
  deleteSubscription,
  duplicateSubscription,
  updateSubscription,
  getSubscription,
  getTotals,
  getPaymentSchedule,
  getSpendBreakdown,
  getSubscriptionReminders,
  getUpcomingPayments,
  listCategories,
  listPaymentMethods,
  listSubscriptions,
} from "@/lib/services/subscriptions";

export const dynamic = "force-dynamic";

function json(data: unknown, status = 200, init?: HeadersInit) {
  const headers = new Headers(init);
  headers.set("Cache-Control", "no-store");
  if (status === 401) headers.set("WWW-Authenticate", 'Bearer realm="Tally API"');
  return Response.json(data, { status, headers });
}

type Context = { params: Promise<{ path: string[] }> };

async function authenticate(request: Request, write = false) {
  const key = /^Bearer (\S+)$/i.exec(request.headers.get("authorization") ?? "")?.[1];
  if (key && key.length >= 16 && key.length <= 128) {
    const writer = await prisma.user.findUnique({
      where: { restWriteApiKey: key },
      select: { id: true },
    });
    if (writer) return writer.id;
    const reader = await getUserIdByApiKey(key);
    if (reader) return write ? json({ error: "insufficient_scope" }, 403) : reader;
  }
  return json({ error: "unauthorized" }, 401);
}

export async function GET(request: Request, { params }: Context) {
  const userId = await authenticate(request);
  if (typeof userId !== "string") return userId;

  const { path } = await params;
  const query = new URL(request.url).searchParams;

  if (path.length === 2 && path[0] === "subscriptions") {
    const subscription = await getSubscription(userId, path[1]);
    return subscription ? json({ subscription }) : json({ error: "not_found" }, 404);
  }

  if (path.length === 1) {
    switch (path[0]) {
      case "subscriptions": {
        const active = query.get("activeOnly");
        if (active !== null && active !== "true" && active !== "false") {
          return json({ error: "invalid_active_only" }, 400);
        }
        const numberParam = (key: string) => {
          const value = query.get(key);
          return value === null ? undefined : value.trim() ? Number(value) : NaN;
        };
        const parsed = searchInput.safeParse({
          activeOnly: active === "true",
          q: query.get("q") ?? undefined,
          category: query.get("category") ?? undefined,
          paymentMethod: query.get("paymentMethod") ?? undefined,
          status: query.get("status") ?? undefined,
          sort: query.get("sort") ?? undefined,
          minMonthlyCost: numberParam("minMonthlyCost"),
          maxMonthlyCost: numberParam("maxMonthlyCost"),
        });
        return parsed.success
          ? json(await listSubscriptions(userId, parsed.data))
          : json({ error: "invalid_query" }, 400);
      }
      case "totals":
        return json(await getTotals(userId));
      case "upcoming-payments": {
        const value = query.get("days") ?? "30";
        const days = Number(value);
        if (!/^\d{1,3}$/.test(value) || days > 365) {
          return json({ error: "invalid_days" }, 400);
        }
        return json(await getUpcomingPayments(userId, days));
      }
      case "payment-schedule": {
        const parsed = rangeInput.safeParse({ start: query.get("start"), end: query.get("end") });
        return parsed.success
          ? json(await getPaymentSchedule(userId, parsed.data.start, parsed.data.end))
          : json({ error: "invalid_range" }, 400);
      }
      case "reminders": {
        const value = query.get("days") ?? "30";
        const days = reminderFields.days.safeParse(/^\d{1,3}$/.test(value) ? Number(value) : NaN);
        const kind = reminderFields.kind.safeParse(query.get("kind") ?? undefined);
        return days.success && kind.success
          ? json(await getSubscriptionReminders(userId, days.data, kind.data))
          : json({ error: "invalid_query" }, 400);
      }
      case "spend-breakdown": {
        const group = groupField.safeParse(query.get("groupBy") ?? "category");
        return group.success
          ? json(await getSpendBreakdown(userId, group.data))
          : json({ error: "invalid_query" }, 400);
      }
      case "categories":
        return json({ categories: await listCategories(userId) });
      case "payment-methods":
        return json({ paymentMethods: await listPaymentMethods(userId) });
    }
  }

  return json({ error: "not_found" }, 404);
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function created(subscription: { id: string }) {
  return json({ subscription }, 201, { Location: `/api/v1/subscriptions/${subscription.id}` });
}

function notFound() {
  return json({ error: "not_found" }, 404);
}

const labelField = (resource: string) => {
  if (resource === "categories") return "category";
  if (resource === "payment-methods") return "paymentMethod";
  return null;
};

function labelResponse(result: Awaited<ReturnType<typeof changeSubscriptionLabel>>, success = 200) {
  if (!result.error) return json(result, success);
  if (result.error === "not_found") return notFound();
  const status = result.error === "invalid_replacement" ? 400 : 409;
  return json({ error: result.error }, status);
}

export async function POST(request: Request, { params }: Context) {
  const [resource, id, action, ...extra] = (await params).path;
  const preview = resource === "subscriptions" && id === "import-preview" && !action;
  const userId = await authenticate(request, !preview);
  if (typeof userId !== "string") return userId;
  if (preview) {
    const parsed = previewInput.safeParse(await readJson(request));
    if (!parsed.success) return json({ error: "invalid_body" }, 400);
    const result = await previewSubscriptionImport(userId, parsed.data.format, parsed.data.content);
    return json(result, result.error ? 400 : 200);
  }
  const field = labelField(resource);
  if (field && !id) {
    const parsed = labelCreate.safeParse(await readJson(request));
    return parsed.success
      ? labelResponse(await changeSubscriptionLabel(userId, field, { action: "create", ...parsed.data }), 201)
      : json({ error: "invalid_body" }, 400);
  }
  if (resource !== "subscriptions" || extra.length) return notFound();
  if (id && action === "duplicate") {
    const subscription = await duplicateSubscription(userId, id);
    return subscription ? created(subscription) : notFound();
  }
  if (id) return notFound();

  const parsed = createInput.safeParse(await readJson(request));
  if (!parsed.success) return json({ error: "invalid_body" }, 400);
  return created(await createSubscription(userId, {
    ...subscriptionWriteDefaults(),
    ...parsed.data,
  }));
}

export async function PATCH(request: Request, { params }: Context) {
  const userId = await authenticate(request, true);
  if (typeof userId !== "string") return userId;
  const [resource, id, ...extra] = (await params).path;
  if (!id || extra.length) return notFound();
  const field = labelField(resource);
  if (field) {
    const name = labelName.safeParse(id);
    const body = labelRename.safeParse(await readJson(request));
    return name.success && body.success
      ? labelResponse(await changeSubscriptionLabel(userId, field, {
        action: "rename", name: name.data, newName: body.data.name,
      }))
      : json({ error: "invalid_body" }, 400);
  }
  if (resource !== "subscriptions") return notFound();

  const parsed = patchInput.safeParse(await readJson(request));
  if (!parsed.success) return json({ error: "invalid_body" }, 400);
  const subscription = await updateSubscription(userId, id, parsed.data);
  return subscription ? json({ subscription }) : notFound();
}

export async function DELETE(request: Request, { params }: Context) {
  const userId = await authenticate(request, true);
  if (typeof userId !== "string") return userId;
  const [resource, id, ...extra] = (await params).path;
  if (!id || extra.length) return notFound();
  const field = labelField(resource);
  if (field) {
    const name = labelName.safeParse(id);
    const query = new URL(request.url).searchParams;
    const parsed = labelDelete.safeParse({ replacement: query.get("replacement") ?? undefined });
    return name.success && parsed.success
      ? labelResponse(await changeSubscriptionLabel(userId, field, { action: "delete", name: name.data, ...parsed.data }))
      : json({ error: "invalid_query" }, 400);
  }
  if (resource !== "subscriptions") return notFound();
  return await deleteSubscription(userId, id)
    ? new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } })
    : notFound();
}
