import "server-only";
import { getUser, prisma } from "./db";
import {
  type Cycle,
  daysUntil,
  effectiveNextBill,
  formatMoney,
  isInTrial,
  monthlyCost,
} from "./money";
import { convert, ensureRates, parseRates } from "./rates";
import { type Embed, hexToInt, sendDiscordEmbed } from "./discord";
import { isMailConfigured, resolveSmtp, sendMail } from "./mail";
import { sendGenericWebhook, sendNtfy, sendSlack } from "./channels";
import { getT } from "./i18n";

type Item = {
  name: string;
  price: string;
  dateLabel: string;
  trial: boolean;
};

type ReviewItem = { name: string; dateLabel: string };

/** Payments due soon, subs up for renewal review, and the running monthly total. */
async function upcomingItems(
  userId: string,
  daysBefore: number,
): Promise<{
  main: string;
  items: Item[];
  reviewItems: ReviewItem[];
  monthlyTotal: number;
}> {
  await ensureRates(userId);
  const user = await getUser(userId);
  const main = user?.currency ?? "JPY";
  const rates = parseRates(user?.ratesJson ?? null);

  const subs = await prisma.subscription.findMany({
    where: { userId, active: true },
  });

  const withNext = subs.map((s) => ({
    s,
    next: effectiveNextBill(
      s.startDate,
      s.trialEndDate ?? s.nextBillDate,
      s.cycle as Cycle,
      s.cycleCount,
    ),
  }));

  const due = withNext
    .map((x) => ({ ...x, d: daysUntil(x.next) }))
    .filter((x) => x.d >= 0 && x.d <= daysBefore)
    .sort((a, b) => a.d - b.d);

  const items = due.map(({ s, next, d }) => {
    const own = s.currency || main;
    const converted = convert(s.cost, own, main, rates);
    const price =
      own === main
        ? formatMoney(s.cost, main)
        : `${formatMoney(s.cost, own)} (≈ ${converted !== null ? formatMoney(converted, main) : "?"})`;
    const dateLabel = `${next.toLocaleDateString("ja-JP", { month: "long", day: "numeric" })}・${d === 0 ? "本日" : `${d}日後`}`;
    return { name: s.name, price, dateLabel, trial: isInTrial(s.trialEndDate) };
  });

  // Subscriptions whose per-item "decide before renewal" window has arrived.
  const reviewItems: ReviewItem[] = withNext
    .map((x) => ({ ...x, d: daysUntil(x.next) }))
    .filter(
      (x) =>
        x.s.cancelReminderDays != null &&
        x.d >= 0 &&
        x.d <= x.s.cancelReminderDays,
    )
    .sort((a, b) => a.d - b.d)
    .map(({ s, next, d }) => ({
      name: s.name,
      dateLabel: `${next.toLocaleDateString("ja-JP", { month: "long", day: "numeric" })}・${d === 0 ? "本日" : `${d}日後`}`,
    }));

  // Monthly total in main currency (trials excluded — free until they end).
  let monthlyTotal = 0;
  for (const s of subs) {
    if (isInTrial(s.trialEndDate)) continue;
    const converted = convert(s.cost, s.currency || main, main, rates);
    if (converted === null) continue;
    monthlyTotal += monthlyCost(converted, s.cycle as Cycle, s.cycleCount);
  }

  return { main, items, reviewItems, monthlyTotal };
}

type Extras = { reviewItems: ReviewItem[]; budgetWarning: string | null };

function buildEmbed(daysBefore: number, items: Item[], extras: Extras): Embed {
  const fields = items.map((i) => ({
    name: i.trial ? `${i.name}（トライアル終了）` : i.name,
    value: `${i.price} / ${i.dateLabel}`,
    inline: true,
  }));
  for (const r of extras.reviewItems) {
    fields.push({
      name: `${r.name}（解約検討）`,
      value: r.dateLabel,
      inline: true,
    });
  }
  return {
    title: items.length
      ? `${daysBefore}日以内の支払い予定（${items.length}件）`
      : `${daysBefore}日以内の支払い予定はありません`,
    description: extras.budgetWarning ?? undefined,
    color: hexToInt("#ff7a00"),
    fields: fields.length ? fields : undefined,
    footer: { text: "Tally" },
    timestamp: new Date().toISOString(),
  };
}

function buildEmailBody(daysBefore: number, items: Item[], extras: Extras) {
  const subject = items.length
    ? `Tally: ${items.length} upcoming payment(s) within ${daysBefore} day(s)`
    : `Tally: no upcoming payments within ${daysBefore} day(s)`;
  const dueLines = items.map(
    (i) =>
      `- ${i.name}${i.trial ? " (trial ends)" : ""}: ${i.price} / ${i.dateLabel}`,
  );
  const textParts: string[] = [];
  if (extras.budgetWarning) textParts.push(extras.budgetWarning, "");
  textParts.push(
    items.length ? `Upcoming payments:\n\n${dueLines.join("\n")}` : "No upcoming payments.",
  );
  if (extras.reviewItems.length) {
    textParts.push(
      "",
      "Review before renewal:",
      ...extras.reviewItems.map((r) => `- ${r.name}: ${r.dateLabel}`),
    );
  }
  const text = textParts.join("\n");

  const html = `<h2 style="font-family:sans-serif">Tally</h2>${
    extras.budgetWarning
      ? `<p style="font-family:sans-serif;color:#ff7a00"><strong>${extras.budgetWarning}</strong></p>`
      : ""
  }${
    items.length
      ? `<ul style="font-family:sans-serif">${items
          .map(
            (i) =>
              `<li><strong>${i.name}</strong>${i.trial ? " (trial ends)" : ""} — ${i.price} · ${i.dateLabel}</li>`,
          )
          .join("")}</ul>`
      : "<p style='font-family:sans-serif'>No upcoming payments.</p>"
  }${
    extras.reviewItems.length
      ? `<p style="font-family:sans-serif"><strong>Review before renewal</strong></p><ul style="font-family:sans-serif">${extras.reviewItems
          .map((r) => `<li>${r.name} — ${r.dateLabel}</li>`)
          .join("")}</ul>`
      : ""
  }`;
  return { subject, text, html };
}

/** Sends the upcoming-payments notification to every configured channel. */
export async function notifyUpcoming(userId: string): Promise<{
  ok: boolean;
  status: number;
  error?: string;
}> {
  const user = await getUser(userId);
  if (!user) return { ok: false, status: 0, error: "no user" };

  const { main, items, reviewItems, monthlyTotal } = await upcomingItems(
    userId,
    user.notifyDaysBefore,
  );
  const results: string[] = [];
  let anyOk = false;

  // Localized title / lines shared by the generic webhook, Slack and ntfy.
  const t = getT(user.lang === "ja" ? "ja" : "en");
  const days = user.notifyDaysBefore;
  const title = items.length
    ? t("notify.title", { days, count: items.length })
    : t("notify.titleEmpty", { days });

  const budget = user.monthlyBudget ?? null;
  const budgetWarning =
    budget != null && monthlyTotal > budget
      ? t("notify.budgetOver", {
          total: formatMoney(monthlyTotal, main),
          budget: formatMoney(budget, main),
        })
      : null;
  const extras: Extras = { reviewItems, budgetWarning };

  const lines: string[] = [];
  if (budgetWarning) lines.push(budgetWarning);
  for (const i of items) {
    lines.push(
      `${i.name}${i.trial ? t("notify.trialSuffix") : ""} — ${i.price} / ${i.dateLabel}`,
    );
  }
  if (reviewItems.length) {
    lines.push(t("notify.reviewHeader"));
    for (const r of reviewItems) lines.push(`${r.name} — ${r.dateLabel}`);
  }

  if (user.discordWebhookUrl) {
    const r = await sendDiscordEmbed(user.discordWebhookUrl, [
      buildEmbed(user.notifyDaysBefore, items, extras),
    ]);
    if (r.ok) anyOk = true;
    else results.push(`Discord: ${r.error ?? r.status}`);
  }

  const smtp = resolveSmtp(user);
  if (user.notifyEmailEnabled && user.notifyEmail && isMailConfigured(smtp)) {
    const body = buildEmailBody(user.notifyDaysBefore, items, extras);
    const r = await sendMail(smtp, user.notifyEmail, body.subject, body.text, body.html);
    if (r.ok) anyOk = true;
    else results.push(`Email: ${r.error}`);
  }

  if (user.webhookEnabled && user.webhookUrl) {
    const r = await sendGenericWebhook(user.webhookUrl, {
      source: "tally",
      event: "upcoming_payments",
      daysBefore: days,
      count: items.length,
      currency: main,
      monthlyTotal,
      budget,
      title,
      items,
      reviewItems,
    });
    if (r.ok) anyOk = true;
    else results.push(`Webhook: ${r.error ?? r.status}`);
  }

  if (user.slackEnabled && user.slackWebhookUrl) {
    const r = await sendSlack(user.slackWebhookUrl, title, lines);
    if (r.ok) anyOk = true;
    else results.push(`Slack: ${r.error ?? r.status}`);
  }

  if (user.ntfyEnabled && user.ntfyUrl) {
    const message = lines.length ? lines.join("\n") : title;
    const r = await sendNtfy(user.ntfyUrl, user.ntfyToken ?? null, title, message);
    if (r.ok) anyOk = true;
    else results.push(`ntfy: ${r.error ?? r.status}`);
  }

  const anyChannel =
    Boolean(user.discordWebhookUrl) ||
    (user.notifyEmailEnabled && Boolean(user.notifyEmail)) ||
    (user.webhookEnabled && Boolean(user.webhookUrl)) ||
    (user.slackEnabled && Boolean(user.slackWebhookUrl)) ||
    (user.ntfyEnabled && Boolean(user.ntfyUrl));
  if (!anyChannel) {
    return { ok: false, status: 0, error: "通知チャンネルが未設定です" };
  }

  return anyOk
    ? { ok: true, status: 200 }
    : { ok: false, status: 502, error: results.join("; ") || "送信に失敗しました" };
}
