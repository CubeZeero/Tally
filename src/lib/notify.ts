import "server-only";
import { getUser, prisma } from "./db";
import {
  type Cycle,
  cycleLabel,
  daysUntil,
  effectiveNextBill,
  formatMoney,
  isInTrial,
} from "./money";
import { convert, ensureRates, parseRates } from "./rates";
import { type Embed, hexToInt, sendDiscordEmbed } from "./discord";
import { isMailConfigured, sendMail } from "./mail";

type Item = {
  name: string;
  price: string;
  dateLabel: string;
  trial: boolean;
};

/** Shared list of payments due within `daysBefore` for a user. */
async function upcomingItems(
  userId: string,
  daysBefore: number,
): Promise<{ main: string; items: Item[] }> {
  await ensureRates(userId);
  const user = await getUser(userId);
  const main = user?.currency ?? "JPY";
  const rates = parseRates(user?.ratesJson ?? null);

  const subs = await prisma.subscription.findMany({
    where: { userId, active: true },
  });
  const due = subs
    .map((s) => ({
      s,
      next: effectiveNextBill(
        s.startDate,
        s.trialEndDate ?? s.nextBillDate,
        s.cycle as Cycle,
        s.cycleCount,
      ),
    }))
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

  return { main, items };
}

function buildEmbed(daysBefore: number, items: Item[]): Embed {
  return {
    title: items.length
      ? `${daysBefore}日以内の支払い予定（${items.length}件）`
      : `${daysBefore}日以内の支払い予定はありません`,
    color: hexToInt("#ff7a00"),
    fields: items.length
      ? items.map((i) => ({
          name: i.trial ? `${i.name}（トライアル終了）` : i.name,
          value: `${i.price} / ${i.dateLabel}`,
          inline: true,
        }))
      : undefined,
    footer: { text: "Tally" },
    timestamp: new Date().toISOString(),
  };
}

function buildEmailBody(daysBefore: number, items: Item[]) {
  const subject = items.length
    ? `Tally: ${items.length} upcoming payment(s) within ${daysBefore} day(s)`
    : `Tally: no upcoming payments within ${daysBefore} day(s)`;
  const lines = items.map(
    (i) =>
      `- ${i.name}${i.trial ? " (trial ends)" : ""}: ${i.price} / ${i.dateLabel}`,
  );
  const text = items.length
    ? `Upcoming payments:\n\n${lines.join("\n")}`
    : "No upcoming payments.";
  const html = `<h2 style="font-family:sans-serif">Tally</h2>${
    items.length
      ? `<ul style="font-family:sans-serif">${items
          .map(
            (i) =>
              `<li><strong>${i.name}</strong>${i.trial ? " (trial ends)" : ""} — ${i.price} · ${i.dateLabel}</li>`,
          )
          .join("")}</ul>`
      : "<p style='font-family:sans-serif'>No upcoming payments.</p>"
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

  const { items } = await upcomingItems(userId, user.notifyDaysBefore);
  const results: string[] = [];
  let anyOk = false;

  if (user.discordWebhookUrl) {
    const r = await sendDiscordEmbed(user.discordWebhookUrl, [
      buildEmbed(user.notifyDaysBefore, items),
    ]);
    if (r.ok) anyOk = true;
    else results.push(`Discord: ${r.error ?? r.status}`);
  }

  if (user.notifyEmailEnabled && user.notifyEmail && isMailConfigured()) {
    const body = buildEmailBody(user.notifyDaysBefore, items);
    const r = await sendMail(user.notifyEmail, body.subject, body.text, body.html);
    if (r.ok) anyOk = true;
    else results.push(`Email: ${r.error}`);
  }

  if (!user.discordWebhookUrl && !(user.notifyEmailEnabled && user.notifyEmail)) {
    return { ok: false, status: 0, error: "通知チャンネルが未設定です" };
  }

  return anyOk
    ? { ok: true, status: 200 }
    : { ok: false, status: 502, error: results.join("; ") || "送信に失敗しました" };
}
