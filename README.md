<p align="center">
  <img src="icons/tally_icon.svg" alt="Tally" width="96" height="110" />
</p>

<h1 align="center">Tally</h1>

<p align="center">A self-hostable subscription management dashboard.</p>

<p align="center">
  English · <a href="README_jp.md">日本語</a>
</p>

---

Tally helps you keep track of the subscriptions you pay for — their cost, billing
cycle, renewal dates, and total monthly / yearly spend — all on a server you own.
Access it from any web browser and run it with a single Docker command.

📖 **Documentation:** [tally.cubezeero.com](https://tally.cubezeero.com/) — getting started, notifications, self-hosting, backups & FAQ (source in [`wiki/`](wiki/))

## Features

- Multi-user — each account manages its own subscriptions, categories, and settings
- Automatic monthly / yearly totals (day / week / month / year, every N cycles)
- Free trial tracking with alerts before the first charge
- Multi-currency with automatic conversion to your main currency
- Monthly budget with a dashboard budget bar and over-budget alerts
- Notifications for upcoming payments — **Discord**, **email**, **generic webhook**, **Slack**, **ntfy**; built-in daily scheduler (no cron)
- iCal calendar feed — subscribe to payment dates in Google / Apple Calendar
- Cancel-decision reminders — get nudged before a renewal to decide whether to keep it
- Subscription duplication, search, status filter, and sorting
- Automatic SQLite backups (kept in the data volume)
- Installable as a **PWA** ("Add to Home Screen"; no push)
- Service icons from [simple-icons](https://www.npmjs.com/package/simple-icons), or upload your own image
- Per-user language & theme — English / 日本語, dark / light
- Calendar view, statistics (top costs, pie & line charts)
- Editable categories & payment methods
- CSV / JSON export & import
- Self-hosted with Docker — data stays in SQLite on your server

## Quick start (Docker Compose)

```bash
# 1. Get the code (stable release)
git clone -b stable https://github.com/CubeZeero/Tally.git
cd Tally

# 2. Create .env and edit it BEFORE the first launch
cp .env.example .env
#    → set SESSION_SECRET (generate one: openssl rand -base64 32)
#    → optionally set TZ / DISABLE_REGISTRATION / BACKUP_*

# 3. Build & start
docker compose up -d --build
```

Open <http://localhost:6400>. On first run you'll create an account (username +
password). Your data is stored only on your server.

> [!IMPORTANT]
> Set `SESSION_SECRET` **before** the first `docker compose up`. Without it,
> Tally uses a random per-process key and everyone is logged out on every
> restart.

## Run with docker run

```bash
docker build -t tally .
docker run -d \
  --name tally \
  -p 6400:6400 \
  -e SESSION_SECRET="$(openssl rand -base64 32)" \
  -e TZ="Asia/Tokyo" \
  -v tally-data:/data \
  tally
```

## Environment variables

Copy `.env.example` to `.env` and edit it. Docker Compose reads this file for
substitution; `.env` is git-ignored, so never commit real secrets.

| Variable | Description | Default |
| --- | --- | --- |
| `SESSION_SECRET` | Signing key for session cookies. Use a long random string (`openssl rand -base64 32`). If unset, a random per-process secret is used and sessions reset on restart. | (random per process) |
| `DATABASE_URL` | SQLite file location | `file:/data/tally.db` (Docker) |
| `TZ` | Timezone for the notification scheduler | `Asia/Tokyo` |
| `DISABLE_REGISTRATION` | Set to `1` to block new sign-ups after the first account | (unset) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | SMTP for email notifications (fallback; per-user SMTP in Settings takes priority) | (unset) |
| `BACKUP_ENABLED` | Enable automatic backups | `true` |
| `BACKUP_INTERVAL_HOURS` | Backup interval in hours | `24` |
| `BACKUP_KEEP` | Number of backups to keep | `7` |
| `BACKUP_DIR` | Backup destination | `backups/` in the data volume |
| `PORT` | Listening port | `6400` |

## Notifications

Tally sends a daily digest of upcoming payments (plus trial-ending, over-budget,
and cancel-review alerts) to any of **Discord**, **email (SMTP)**, **generic
webhook**, **Slack**, and **ntfy** — all configured per-user in Settings →
Notifications, and you can enable several at once. The built-in scheduler sends
once per day at your chosen time (container timezone); no cron required. See the
[notifications guide](https://tally.cubezeero.com/notifications/) for details.

## Currencies & rates

Pick your main currency in Settings. New accounts default to **USD** when signing
up in English and **JPY** otherwise; you can change it anytime. Subscriptions in
other currencies are converted automatically using rates from
[open.er-api.com](https://open.er-api.com) (no API key), refreshed every 6 hours
or on demand.

## Updating

Releases are tracked on the `stable` branch and version tags (e.g. `v1.0.0`).
Additive schema migrations run automatically on start, so your data is preserved.

```bash
git pull                       # if you cloned -b stable
docker compose up -d --build
```

Pin or roll back to a specific release with `git checkout v1.0.0`.

## Local development

```bash
npm install
cp .env.example .env
npx prisma db push
npm run dev   # http://localhost:6400
```

## Tech stack

Next.js (App Router) · TypeScript · Prisma · SQLite · Tailwind CSS

## License

Copyright (C) 2026 CubeZeero

Licensed under the [GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0).
If you run a modified version of Tally and make it available to users over a
network, you must also make the source code of your modified version available
to them.
