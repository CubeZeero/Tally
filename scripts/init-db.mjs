// Applies the database schema at container startup using the bundled
// @prisma/client (no Prisma CLI required at runtime).
//
// Handles both fresh installs and additive upgrades of an existing volume:
//   - creates any missing tables / indexes
//   - adds any missing columns to existing tables (ALTER TABLE ADD COLUMN)
//
// It does NOT drop/rename columns — only additive changes, which covers
// Tally's schema evolution. Data seeding (default categories etc.) is handled
// by the app's ensureBootstrap() on first authenticated load.
import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const prisma = new PrismaClient();

function stripComments(sql) {
  return sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n");
}

function splitStatements(sql) {
  return sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

// Parse `CREATE TABLE "X" ( "col" TYPE ..., ... )` into { table, columns: [{name, def}] }.
function parseCreateTable(stmt) {
  const nameMatch = stmt.match(/CREATE TABLE\s+"([^"]+)"\s*\(/i);
  if (!nameMatch) return null;
  const table = nameMatch[1];
  const open = stmt.indexOf("(");
  const close = stmt.lastIndexOf(")");
  const body = stmt.slice(open + 1, close);
  const columns = [];
  for (const raw of body.split(",")) {
    const line = raw.trim();
    const colMatch = line.match(/^"([^"]+)"\s+(.*)$/);
    if (colMatch) columns.push({ name: colMatch[1], def: colMatch[2] });
  }
  return { table, columns };
}

async function tableExists(table) {
  const rows = await prisma.$queryRawUnsafe(
    "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
    table,
  );
  return Array.isArray(rows) && rows.length > 0;
}

async function existingColumns(table) {
  const rows = await prisma.$queryRawUnsafe(`PRAGMA table_info("${table}")`);
  return new Set((rows ?? []).map((r) => r.name));
}

try {
  const sql = stripComments(
    readFileSync(new URL("./init.sql", import.meta.url), "utf8"),
  );
  const statements = splitStatements(sql);
  let created = 0;
  let altered = 0;

  for (const stmt of statements) {
    if (/^CREATE TABLE/i.test(stmt)) {
      const parsed = parseCreateTable(stmt);
      if (!parsed) continue;

      if (!(await tableExists(parsed.table))) {
        await prisma.$executeRawUnsafe(stmt);
        created++;
        continue;
      }

      // Table exists — add any missing columns.
      const have = await existingColumns(parsed.table);
      for (const col of parsed.columns) {
        if (have.has(col.name)) continue;
        if (/PRIMARY KEY|AUTOINCREMENT/i.test(col.def)) continue; // not addable
        try {
          await prisma.$executeRawUnsafe(
            `ALTER TABLE "${parsed.table}" ADD COLUMN "${col.name}" ${col.def}`,
          );
          altered++;
        } catch (e) {
          console.warn(
            `[init-db] could not add ${parsed.table}.${col.name}: ${e.message ?? e}`,
          );
        }
      }
    } else if (/^CREATE (UNIQUE )?INDEX/i.test(stmt)) {
      // Make index creation idempotent.
      const idempotent = stmt.replace(
        /^CREATE (UNIQUE )?INDEX/i,
        (_m, u) => `CREATE ${u ?? ""}INDEX IF NOT EXISTS`,
      );
      try {
        await prisma.$executeRawUnsafe(idempotent);
      } catch (e) {
        console.warn(`[init-db] index skipped: ${e.message ?? e}`);
      }
    } else {
      try {
        await prisma.$executeRawUnsafe(stmt);
      } catch (e) {
        console.warn(`[init-db] statement skipped: ${e.message ?? e}`);
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    const users = await tx.user.findMany({
      select: { id: true, apiKey: true, restWriteApiKey: true, notifyToken: true },
    });
    for (const { id, ...keys } of users) {
      const updates = {};
      for (const [field, key] of Object.entries(keys)) {
        if (key && !/^sha256:[0-9a-f]{64}$/.test(key)) {
          updates[field] = "sha256:" + createHash("sha256").update(key).digest("hex");
        }
      }
      if (Object.keys(updates).length) await tx.user.update({ where: { id }, data: updates });
    }

    // Old grants were minted before token purposes and explicit write scope
    // were enforced. Purge them when upgrading, keeping current grants.
    await tx.oAuthAuthCode.deleteMany({ where: { NOT: { code: { startsWith: "v2:" } } } });
    await tx.oAuthRefreshToken.deleteMany({ where: { NOT: { tokenHash: { startsWith: "v2:" } } } });
  });

  console.log(
    `[init-db] ready (tables created: ${created}, columns added: ${altered})`,
  );

  // ---- One-time migration: single-password → multi-user ----
  // Drop old single-column unique indexes (replaced by composite userId+name).
  for (const idx of ["Category_name_key", "PaymentMethod_name_key"]) {
    try {
      await prisma.$executeRawUnsafe(`DROP INDEX IF EXISTS "${idx}"`);
    } catch (e) {
      console.warn(`[init-db] drop index ${idx} skipped: ${e.message ?? e}`);
    }
  }

  try {
    const userRows = await prisma.$queryRawUnsafe(
      'SELECT COUNT(*) as c FROM "User"',
    );
    const userCount = Number(userRows?.[0]?.c ?? 0);
    if (userCount === 0) {
      let old = null;
      try {
        const rows = await prisma.$queryRawUnsafe(
          'SELECT * FROM "Setting" WHERE id = 1',
        );
        old = rows?.[0] ?? null;
      } catch {
        // No legacy Setting table (fresh install) — nothing to migrate.
      }
      if (old && old.passwordHash) {
        const token =
          globalThis.crypto.randomUUID().replace(/-/g, "") +
          globalThis.crypto.randomUUID().replace(/-/g, "");
        const user = await prisma.user.create({
          data: {
            username: "admin",
            passwordHash: old.passwordHash,
            currency: old.currency ?? "JPY",
            discordWebhookUrl: old.discordWebhookUrl ?? null,
            notifyToken: "sha256:" + createHash("sha256").update(old.notifyToken ?? token.slice(0, 32)).digest("hex"),
            notifyDaysBefore: Number(old.notifyDaysBefore ?? 3),
            notifyEnabled: Boolean(old.notifyEnabled),
            notifyHour: Number(old.notifyHour ?? 9),
            lastNotifiedOn: old.lastNotifiedOn ?? null,
            ratesJson: old.ratesJson ?? null,
          },
        });
        for (const table of ["Subscription", "Category", "PaymentMethod"]) {
          await prisma.$executeRawUnsafe(
            `UPDATE "${table}" SET "userId" = ? WHERE "userId" IS NULL`,
            user.id,
          );
        }
        console.log(
          '[init-db] migrated existing data to user "admin" (log in with your existing password)',
        );
      }
    }
  } catch (e) {
    console.warn(`[init-db] multi-user migration skipped: ${e.message ?? e}`);
  }
} catch (err) {
  console.error("[init-db] failed:", err);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
