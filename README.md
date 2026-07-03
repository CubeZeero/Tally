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

## Features

- Multi-user — each account manages its own subscriptions, categories, and settings
- Automatic monthly / yearly totals (day / week / month / year, every N cycles)
- Multi-currency with automatic conversion to your main currency
- Service icons from [simple-icons](https://www.npmjs.com/package/simple-icons), or upload your own image
- Dark / light theme and i18n (English / 日本語)
- Discord notifications (embed) for upcoming payments — built-in daily scheduler, no cron needed
- Calendar view and statistics (top costs, pie & line charts)
- Editable categories & payment methods
- CSV / JSON export & import
- Self-hosted with Docker — data stays in SQLite on your server

## Quick start (Docker Compose)

```bash
# 1. Set a strong SESSION_SECRET in docker-compose.yml (or generate one)
openssl rand -base64 32

# 2. Build & start
docker compose up -d --build
```

Open <http://localhost:6400>. On first run you'll create an account (username +
password). Your data is stored only on your server.

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

| Variable | Description | Default |
| --- | --- | --- |
| `SESSION_SECRET` | Signing key for session cookies. Change in production. | (dev fallback) |
| `DATABASE_URL` | SQLite file location | `file:/data/tally.db` (Docker) |
| `TZ` | Timezone for the notification scheduler | `Asia/Tokyo` |
| `PORT` | Listening port | `6400` |

## Discord notifications

1. Create a webhook in your Discord channel settings.
2. In Settings -> Notifications, paste the webhook URL, enable the daily
   notification, and pick a send time and how many days ahead to notify.
3. Use "Send test now" to verify.

Tally's built-in scheduler sends upcoming payments once per day at the chosen
time (in the container's timezone) — no cron required.

## Currencies & rates

Pick your main currency in Settings. Subscriptions in other currencies are
converted automatically using rates from
[open.er-api.com](https://open.er-api.com) (no API key), refreshed every 6 hours
or on demand.

## Backup

The SQLite file holds everything:

```bash
docker compose cp tally:/data/tally.db ./tally-backup.db
```

## Updating

Tally applies additive schema migrations automatically on start, so your data is
preserved across updates.

```bash
git pull
docker compose up -d --build
```

## Forgot password

List users (usernames):

```bash
docker compose exec -T tally node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.user.findMany().then(u=>{console.log(u.map(x=>x.username));return p.\$disconnect()})"
```

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
