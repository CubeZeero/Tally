import { PrismaClient } from "@prisma/client";

// Cross-runtime random token (works in both node and edge bundles).
export function randomToken(): string {
  return (
    globalThis.crypto.randomUUID().replace(/-/g, "") +
    globalThis.crypto.randomUUID().replace(/-/g, "")
  ).slice(0, 32);
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

const DEFAULT_CATEGORIES: Record<string, string[]> = {
  ja: [
    "エンタメ",
    "動画配信",
    "音楽",
    "仕事・ツール",
    "AI・ツール",
    "学習",
    "ニュース",
    "ストレージ・クラウド",
    "ゲーム",
    "健康・フィットネス",
    "通信・モバイル",
    "ショッピング",
    "食・デリバリー",
    "金融・保険",
    "写真・デザイン",
    "その他",
  ],
  en: [
    "Entertainment",
    "Video streaming",
    "Music",
    "Work & tools",
    "AI tools",
    "Learning",
    "News",
    "Storage & cloud",
    "Gaming",
    "Health & fitness",
    "Mobile & internet",
    "Shopping",
    "Food & delivery",
    "Finance & insurance",
    "Photo & design",
    "Other",
  ],
};

const DEFAULT_PAYMENT_METHODS: Record<string, string[]> = {
  ja: [
    "クレジットカード",
    "デビットカード",
    "銀行振替",
    "Apple Pay",
    "Google Pay",
    "PayPal",
    "その他",
  ],
  en: [
    "Credit card",
    "Debit card",
    "Bank transfer",
    "Apple Pay",
    "Google Pay",
    "PayPal",
    "Other",
  ],
};

export async function getUser(userId: string) {
  return prisma.user.findUnique({ where: { id: userId } });
}

/**
 * Ensures a user has a notify token and default lists. Seeds categories /
 * payment methods (in the user's language) only when the user has none.
 */
export async function seedUserDefaults(userId: string, lang = "en") {
  const cats = DEFAULT_CATEGORIES[lang] ?? DEFAULT_CATEGORIES.en;
  const pms = DEFAULT_PAYMENT_METHODS[lang] ?? DEFAULT_PAYMENT_METHODS.en;
  if ((await prisma.category.count({ where: { userId } })) === 0) {
    await prisma.category.createMany({
      data: cats.map((name, i) => ({ userId, name, sort: i })),
    });
  }
  if ((await prisma.paymentMethod.count({ where: { userId } })) === 0) {
    await prisma.paymentMethod.createMany({
      data: pms.map((name, i) => ({ userId, name, sort: i })),
    });
  }
}
