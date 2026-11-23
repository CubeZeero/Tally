---
icon: lucide/settings
---

# Configuration

Tally has two kinds of configuration: **server-side environment variables**
(specified when the container starts), and **per-user options** you change in
the app's settings screen.

!!! info "Environment variables are covered in Getting Started"
    The server-side environment variables — `SESSION_SECRET`, `TZ`,
    `DISABLE_REGISTRATION`, `SMTP_*`, `BACKUP_*`, and so on — along with how to
    write your `.env` file, are covered in [Getting Started](getting-started.md),
    since they need to be set before the first launch.

## Per-user settings (in the app)

In the app's **Settings** screen you can change the following:

- **Language** — Japanese / English (per user; also selectable at sign-up)
- **Main currency** — other currencies are converted to this one for totals
  (defaults based on your sign-up language: English → USD / Japanese → JPY)
- **Monthly budget** — used for the dashboard budget bar and over-budget
  notifications
- **Notifications** — Discord / email (plus per-user SMTP) / generic webhook /
  Slack / ntfy, send time, days-before (collapsible section)
- **iCal calendar integration** — issue, regenerate, or disable the feed URL
- **Backups** — check status and trigger manual backups
- **Categories & payment methods** — editable lists (initialized from your
  chosen language)
- **Exchange rates** — manual refresh
- **Password** — change your account password

## Locking down a public instance

If you expose Tally to the internet:

1. Set a strong `SESSION_SECRET` (see [Getting Started](getting-started.md)).
2. Development builds disable new sign-ups after initial setup by default. On earlier releases, set `DISABLE_REGISTRATION=1` and run `docker compose up -d`.
3. Put it behind HTTPS (a reverse proxy or Tailscale). Tally automatically adds
   the `Secure` attribute to session cookies when it detects
   `x-forwarded-proto: https`.
