import "server-only";
import { getUser, prisma } from "./db";
import {
  type Cycle,
  cycleLabel,
  daysUntil,
  effectiveNextBill,
  formatMoney,
} from "./money";
import { convert, ensureRates, parseRates } from "./rates";
import { type Embed, hexToInt, sendDiscordEmbed } from "./discord";

/** Builds the "upcoming payments" embed for one user. */
export async function buildUpcomingEmbed(
  userId: string,
  daysBefore: number,
): Promise<Embed> {
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
      next: effectiveNextBill(s.startDate, s.nextBillDate, s.cycle as Cycle, s.cycleCount),
    }))
    .map((x) => ({ ...x, d: daysUntil(x.next) }))
    .filter((x) => x.d >= 0 && x.d <= daysBefore)
    .sort((a, b) => a.d - b.d);

  const fields = due.map(({ s, next, d }) => {
    const own = s.currency || main;
    const converted = convert(s.cost, own, main, rates);
    const price =
      own === main
        ? formatMoney(s.cost, main)
        : `${formatMoney(s.cost, own)}（≈ ${converted !== null ? formatMoney(converted, main) : "?"}）`;
    return {
      name: s.name,
      value: `${price} / ${cycleLabel(s.cycle as Cycle, s.cycleCount)}\n${next.toLocaleDateString("ja-JP", { month: "long", day: "numeric" })}・${d === 0 ? "本日" : `${d}日後`}`,
      inline: true,
    };
  });

  return {
    title: due.length
      ? `${daysBefore}日以内の支払い予定（${due.length}件）`
      : `${daysBefore}日以内の支払い予定はありません`,
    color: hexToInt("#ff7a00"),
    fields: fields.length ? fields : undefined,
    footer: { text: "Tally" },
    timestamp: new Date().toISOString(),
  };
}

export async function notifyUpcoming(userId: string): Promise<{
  ok: boolean;
  status: number;
  error?: string;
}> {
  const user = await getUser(userId);
  if (!user?.discordWebhookUrl) {
    return { ok: false, status: 0, error: "Webhook URL が未設定です" };
  }
  const embed = await buildUpcomingEmbed(userId, user.notifyDaysBefore);
  return sendDiscordEmbed(user.discordWebhookUrl, [embed]);
}
