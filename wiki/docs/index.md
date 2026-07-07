---
icon: lucide/rocket
---

# Tally

**Tally** is a self-hostable subscription management dashboard. Track the
subscriptions you pay for — their cost, billing cycle, renewal dates, and total
monthly / yearly spend — all on a server you own. Access it from any web browser
and run it with a single Docker command.

## Highlights

- **Multi-user** — each account manages its own subscriptions, categories, and settings
- **Free trial tracking** with alerts before the first charge
- **Multi-currency** with automatic conversion to your main currency
- **Notifications** for upcoming payments — Discord (embed) and email, built-in daily scheduler (no cron)
- **Calendar** view, **statistics**, search & filter
- **Per-user language & theme** — English / 日本語, dark / light
- **Self-hosted** with Docker — data stays in SQLite on your server

## Quick links

- [Getting started](getting-started.md) — run Tally with Docker in a minute
- [Configuration](configuration.md) — environment variables & settings
- [Features](features.md) — everything Tally does
- [Notifications](notifications.md) — Discord & email
- [Self-hosting](self-hosting.md) — updates, backups, security
- [FAQ](faq.md) — common questions

!!! tip "Just want to try it?"

    ```bash
    git clone https://github.com/CubeZeero/Tally.git
    cd Tally
    docker compose up -d --build
    ```

    Then open <http://localhost:6400> and create your account.

## Tech stack

Next.js (App Router) · TypeScript · Prisma · SQLite · Tailwind CSS. Licensed
under **AGPL-3.0**.
