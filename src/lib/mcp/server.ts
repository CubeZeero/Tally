import "server-only";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { BodyTooLargeError, readBody } from "@/lib/request-body";
import { z } from "zod";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import {
  groupField, labelChange, labelName, previewFields, rangeFields, rangeInput, reminderFields,
  searchFields, searchInput,
} from "@/lib/services/integration-input";
import { changeSubscriptionLabel } from "@/lib/services/subscription-labels";
import { previewSubscriptionImport } from "@/lib/services/import-preview";
import type { Cycle } from "@/lib/money";
import { getUserIdByApiKey } from "@/lib/auth";
import { mcpResource, publicOrigin, verifyAccessToken } from "@/lib/oauth";
import {
  listSubscriptions,
  getSubscription,
  getTotals,
  getPaymentSchedule,
  getSpendBreakdown,
  getSubscriptionReminders,
  getUpcomingPayments,
  listCategories,
  listPaymentMethods,
  createSubscription,
  subscriptionWriteDefaults,
  updateSubscription,
  toggleSubscription,
  duplicateSubscription,
  type SubscriptionWrite,
} from "@/lib/services/subscriptions";
import { APP_VERSION } from "@/lib/version";

function json(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function userIdOf(extra: { authInfo?: AuthInfo }): string {
  const id = extra.authInfo?.extra?.userId;
  if (typeof id !== "string") throw new Error("unauthenticated");
  return id;
}

const errorResult = (text: string) => ({ content: [{ type: "text" as const, text }], isError: true });
const notFound = () => errorResult("Subscription not found.");

/** Returns an error result if the token lacks tally:write, else null. */
function denyWithoutWrite(extra: { authInfo?: AuthInfo }) {
  const scopes = extra.authInfo?.scopes ?? [];
  return scopes.includes("tally:write")
    ? null
    : errorResult(
        "This connection is read-only. Reconnect via OAuth and approve write access (tally:write) to modify subscriptions.",
      );
}

// Zod shape for a subscription write (shared by create/update; update makes all optional).
const writeFields = {
  name: z.string().describe("Display name"),
  cost: z.number().describe("Price per billing period"),
  currency: z.string().optional().describe("ISO code, e.g. USD; omit to use the main currency"),
  cycle: z.enum(["day", "week", "month", "year"]).optional().describe("Billing cycle unit (default month)"),
  cycleCount: z.number().int().min(1).optional().describe("Every N cycle units (default 1)"),
  startDate: z.string().optional().describe("First billing date, YYYY-MM-DD (default today)"),
  nextBillDate: z.string().optional().describe("Explicit next payment date, YYYY-MM-DD"),
  trialEndDate: z.string().optional().describe("Free-trial end date, YYYY-MM-DD"),
  description: z.string().optional(),
  category: z.string().optional(),
  paymentMethod: z.string().optional(),
  url: z.string().optional(),
  cancelReminderDays: z.number().int().min(0).optional().describe("Remind to review this many days before renewal"),
  color: z.string().optional().describe("Hex color, e.g. #ff7a00"),
  active: z.boolean().optional(),
};
type WriteArgs = {
  name?: string;
  cost?: number;
  currency?: string;
  cycle?: Cycle;
  cycleCount?: number;
  startDate?: string;
  nextBillDate?: string;
  trialEndDate?: string;
  description?: string;
  category?: string;
  paymentMethod?: string;
  url?: string;
  cancelReminderDays?: number;
  color?: string;
  active?: boolean;
};

function fullWrite(a: WriteArgs): SubscriptionWrite {
  const defaults = subscriptionWriteDefaults();
  return {
    ...defaults,
    ...partialWrite(a),
    name: a.name?.trim() ?? "",
    cost: Number.isFinite(a.cost) ? (a.cost as number) : 0,
    color: a.color || defaults.color,
  };
}

function partialWrite(a: WriteArgs): Partial<SubscriptionWrite> {
  const d: Partial<SubscriptionWrite> = {};
  if (a.name !== undefined) d.name = a.name.trim();
  if (a.cost !== undefined) d.cost = a.cost;
  if (a.currency !== undefined) d.currency = a.currency.trim() || null;
  if (a.cycle !== undefined) d.cycle = a.cycle;
  if (a.cycleCount !== undefined) d.cycleCount = Math.max(1, a.cycleCount);
  if (a.startDate !== undefined) d.startDate = new Date(a.startDate);
  if (a.nextBillDate !== undefined) d.nextBillDate = a.nextBillDate ? new Date(a.nextBillDate) : null;
  if (a.trialEndDate !== undefined) d.trialEndDate = a.trialEndDate ? new Date(a.trialEndDate) : null;
  if (a.description !== undefined) d.description = a.description.trim() || null;
  if (a.category !== undefined) d.category = a.category.trim() || null;
  if (a.paymentMethod !== undefined) d.paymentMethod = a.paymentMethod.trim() || null;
  if (a.url !== undefined) d.url = a.url.trim() || null;
  if (a.cancelReminderDays !== undefined) d.cancelReminderDays = a.cancelReminderDays;
  if (a.color !== undefined) d.color = a.color;
  if (a.active !== undefined) d.active = a.active;
  return d;
}

function createServer() {
  const server = new McpServer({ name: "tally", version: APP_VERSION });
  server.tool(
    "list_subscriptions",
    "Search the user's subscriptions by name, category, payment method, status, or monthly cost in their main currency. Supports sorting.",
    searchFields,
    async (args, extra) => {
      const parsed = searchInput.safeParse(args);
      return parsed.success
        ? json(await listSubscriptions(userIdOf(extra), parsed.data))
        : errorResult("Check status and monthly cost filters.");
    },
  );

  server.tool(
    "get_subscription",
    "Get a single subscription by its id.",
    { id: z.string().describe("Subscription id") },
    async ({ id }, extra) => {
      const s = await getSubscription(userIdOf(extra), id);
      return s
        ? json(s)
        : { content: [{ type: "text" as const, text: "Subscription not found." }], isError: true };
    },
  );

  server.tool(
    "get_totals",
    "Get monthly and yearly spend totals in the main currency (active subscriptions, trials excluded), with budget status.",
    {},
    async (_args, extra) => json(await getTotals(userIdOf(extra))),
  );

  server.tool(
    "get_upcoming_payments",
    "List active subscriptions due within the given number of days (default 30), soonest first.",
    { days: z.number().int().min(1).max(365).optional().describe("Look-ahead window in days") },
    async ({ days }, extra) => json(await getUpcomingPayments(userIdOf(extra), days ?? 30)),
  );

  server.tool(
    "list_categories",
    "List the user's category names.",
    {},
    async (_args, extra) => json(await listCategories(userIdOf(extra))),
  );

  server.tool(
    "list_payment_methods",
    "List the user's payment method names.",
    {},
    async (_args, extra) => json(await listPaymentMethods(userIdOf(extra))),
  );

  server.tool(
    "get_payment_schedule",
    "Get every scheduled charge and its converted total in an inclusive YYYY-MM-DD range of at most 366 days.",
    rangeFields,
    async (args, extra) => {
      const parsed = rangeInput.safeParse(args);
      return parsed.success
        ? json(await getPaymentSchedule(userIdOf(extra), parsed.data.start, parsed.data.end))
        : errorResult("Provide an inclusive date range of at most 366 days.");
    },
  );

  server.tool(
    "get_subscription_reminders",
    "List upcoming trial end dates and subscription review deadlines. Includes overdue review deadlines for upcoming renewals. Defaults to 30 days.",
    reminderFields,
    async ({ days, kind }, extra) => json(await getSubscriptionReminders(userIdOf(extra), days, kind)),
  );

  server.tool(
    "get_spend_breakdown",
    "Get monthly and yearly spending by category or payment method, excluding paused subscriptions and active trials.",
    { groupBy: groupField.optional() },
    async ({ groupBy }, extra) => json(await getSpendBreakdown(userIdOf(extra), groupBy)),
  );

  server.tool(
    "preview_subscription_import",
    "Dry-run up to 500 CSV or JSON subscription rows. Reports valid rows, duplicate names, and errors without saving.",
    previewFields,
    async ({ format, content }, extra) => {
      const result = await previewSubscriptionImport(userIdOf(extra), format, content);
      return result.error ? errorResult(result.error) : json(result);
    },
  );

  server.tool(
    "manage_subscription_label",
    "Create, rename, or delete a category or payment method. Renaming updates subscriptions. Deleting an in-use label requires a replacement. Requires tally:write.",
    {
      field: groupField,
      action: z.enum(["create", "rename", "delete"]),
      name: labelName,
      newName: labelName.optional(),
      replacement: labelName.optional(),
    },
    async ({ field, ...args }, extra) => {
      const denied = denyWithoutWrite(extra);
      if (denied) return denied;
      const parsed = labelChange.safeParse(args);
      if (!parsed.success) return errorResult("Check name, newName, and replacement for the selected action.");
      const result = await changeSubscriptionLabel(userIdOf(extra), field, parsed.data);
      return result.error ? errorResult(result.error) : json(result);
    },
  );

  // ---- Writes (require the tally:write scope) --------------------------

  server.tool(
    "create_subscription",
    "Create a new subscription. Requires the tally:write scope.",
    writeFields,
    async (a, extra) => {
      const denied = denyWithoutWrite(extra);
      if (denied) return denied;
      return json(await createSubscription(userIdOf(extra), fullWrite(a)));
    },
  );

  server.tool(
    "update_subscription",
    "Update fields of an existing subscription (only the fields you pass change). Requires tally:write.",
    { id: z.string().describe("Subscription id"), ...Object.fromEntries(Object.entries(writeFields).map(([k, v]) => [k, v.optional()])) },
    async (a, extra) => {
      const denied = denyWithoutWrite(extra);
      if (denied) return denied;
      const { id, ...rest } = a as WriteArgs & { id: string };
      const s = await updateSubscription(userIdOf(extra), id, partialWrite(rest));
      return s ? json(s) : notFound();
    },
  );

  server.tool(
    "toggle_subscription",
    "Activate or deactivate a subscription. Requires tally:write.",
    { id: z.string().describe("Subscription id"), active: z.boolean().describe("true = active, false = inactive") },
    async ({ id, active }, extra) => {
      const denied = denyWithoutWrite(extra);
      if (denied) return denied;
      const s = await toggleSubscription(userIdOf(extra), id, active);
      return s ? json(s) : notFound();
    },
  );

  server.tool(
    "duplicate_subscription",
    "Duplicate an existing subscription. Requires tally:write.",
    { id: z.string().describe("Subscription id") },
    async ({ id }, extra) => {
      const denied = denyWithoutWrite(extra);
      if (denied) return denied;
      const s = await duplicateSubscription(userIdOf(extra), id);
      return s ? json(s) : notFound();
    },
  );
  return server;
}

async function authenticate(req: Request): Promise<AuthInfo | undefined> {
  const bearer = /^Bearer ([^\s,]+)$/i.exec(req.headers.get("authorization") ?? "")?.[1];
  if (!bearer || bearer.length > 4096) return undefined;
  const claims = await verifyAccessToken(bearer, mcpResource(req));
  if (claims?.scopes.includes("tally:read")) {
    return { token: bearer, clientId: claims.clientId, scopes: claims.scopes, extra: { userId: claims.userId } };
  }
  const userId = await getUserIdByApiKey(bearer);
  if (userId) return { token: bearer, clientId: userId, scopes: ["tally:read"], extra: { userId } };
  return undefined;
}

export async function mcpHandler(req: Request): Promise<Response> {
  const origin = req.headers.get("origin");
  const canonical = publicOrigin(req);
  const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
  if (origin && origin !== canonical && origin !== new URL(req.url).origin) {
    return Response.json({ error: "invalid_origin" }, { status: 403, headers });
  }

  const authInfo = await authenticate(req);
  if (!authInfo) {
    const metadata = new URL("/.well-known/oauth-protected-resource/api/mcp", canonical);
    return Response.json({ error: "unauthorized" }, {
      status: 401,
      headers: { ...headers, "WWW-Authenticate": `Bearer resource_metadata="${metadata}"` },
    });
  }
  if (req.method !== "POST") return new Response(null, { status: 405, headers: { ...headers, Allow: "POST" } });

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(new TextDecoder().decode(await readBody(req, 1024 * 1024)));
  } catch (error) {
    const status = error instanceof BodyTooLargeError ? 413 : 400;
    return Response.json({ error: status === 413 ? "body_too_large" : "invalid_json" }, { status, headers });
  }

  const server = createServer();
  const transport = new WebStandardStreamableHTTPServerTransport({ enableJsonResponse: true });
  await server.connect(transport);
  try {
    const response = await transport.handleRequest(req, { authInfo, parsedBody });
    for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
    return response;
  } finally {
    await server.close();
  }
}
