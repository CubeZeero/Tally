---
icon: lucide/settings
---

# Configuration

Tally is configured with a few environment variables (for the server) and
per-user options (in the app's Settings page).

## Environment variables

| Variable | Description | Default |
| --- | --- | --- |
| `SESSION_SECRET` | Signing key for session cookies. Use a long random string (`openssl rand -base64 32`). If unset, a random per-process secret is used and sessions reset on restart. | random per process |
| `DATABASE_URL` | SQLite file location | `file:/data/tally.db` (Docker) |
| `TZ` | Timezone for the notification scheduler | `Asia/Tokyo` |
| `DISABLE_REGISTRATION` | Set to `1` to block new sign-ups after the first account | (unset) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | Optional SMTP for email notifications | (unset) |
| `PORT` | Listening port | `6400` |

!!! warning "Always set SESSION_SECRET in production"
    The repository is public, so a hardcoded fallback would be known to
    everyone. If you leave it unset, Tally generates a random secret **per
    process** — secure, but everyone is logged out on each restart. Set a
    stable secret to keep sessions alive.

Provide secrets via a git-ignored `.env` file next to `docker-compose.yml`
(do not commit real secrets):

```bash
echo "SESSION_SECRET=$(openssl rand -base64 32)" >> .env
```

`docker-compose.yml` reads these via substitution, e.g.:

```yaml
environment:
  SESSION_SECRET: "${SESSION_SECRET:-}"
  TZ: "${TZ:-Asia/Tokyo}"
  DISABLE_REGISTRATION: "${DISABLE_REGISTRATION:-}"
```

## Per-user settings (in the app)

Open **Settings** in the app to configure:

- **Language** — English / 日本語 (per user; also chosen at sign-up)
- **Main currency** — other currencies are converted to this for totals
- **Notifications** — Discord webhook, email, send time, days ahead (collapsible section)
- **Categories & payment methods** — editable lists, seeded in your language
- **Exchange rates** — refresh on demand
- **Password** — change your account password

## Locking down a public instance

If you expose Tally to the internet:

1. Set a strong `SESSION_SECRET`.
2. Create your account, then set `DISABLE_REGISTRATION=1` and restart.
3. Put it behind HTTPS (a reverse proxy or Tailscale). Tally marks the session
   cookie `Secure` automatically when it sees `x-forwarded-proto: https`.
