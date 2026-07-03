import { PrismaClient } from "@prisma/client";

// Cross-runtime random token (works in both node and edge bundles).
function randomToken(): string {
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

export const DEFAULT_CATEGORIES = [
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
];

export const DEFAULT_PAYMENT_METHODS = [
  "クレジットカード",
  "デビットカード",
  "銀行振替",
  "Apple Pay",
  "Google Pay",
  "PayPal",
  "その他",
];

export async function getUser(userId: string) {
  return prisma.user.findUnique({ where: { id: userId } });
}

/**
 * Ensures a user has a notify token and default lists. Seeds categories /
 * payment methods only when the user has none (so claimed data isn't duplicated).
 */
export async function seedUserDefaults(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { notifyToken: randomToken() },
  });
  if ((await prisma.category.count({ where: { userId } })) === 0) {
    await prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map((name, i) => ({ userId, name, sort: i })),
    });
  }
  if ((await prisma.paymentMethod.count({ where: { userId } })) === 0) {
    await prisma.paymentMethod.createMany({
      data: DEFAULT_PAYMENT_METHODS.map((name, i) => ({ userId, name, sort: i })),
    });
  }
}
