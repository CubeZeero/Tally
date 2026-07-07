---
icon: lucide/bell
---

# Notifications

Tally can send a daily digest of **upcoming payments** (and trial-ending
alerts) to Discord and/or email. A built-in scheduler handles the timing — no
cron required.

## How it works

- The scheduler checks every minute. Once per day, at your configured **send
  time** (in the container's timezone), it sends a digest of payments due within
  your **days-ahead** window.
- The digest is sent to every channel you've configured (Discord and/or email).
- Times follow the container `TZ` (default `Asia/Tokyo`).

## Discord

1. In Discord: **Channel settings → Integrations → Webhooks → New Webhook**, copy
   the URL.
2. In Tally: **Settings → Notifications**, paste the **Discord Webhook URL**.
3. Enable *"Send upcoming payments to Discord daily at this time"* and set the
   time and days-ahead.
4. Click **Send test now** to verify.

!!! note "Only real Discord webhooks are accepted"
    For security (SSRF protection), the webhook URL must be a
    `https://discord.com/api/webhooks/...` address.

## Email (SMTP)

Email requires server-side SMTP configuration via environment variables:

```yaml
environment:
  SMTP_HOST: "smtp.example.com"
  SMTP_PORT: "587"        # 465 uses implicit TLS
  SMTP_USER: "you@example.com"
  SMTP_PASS: "app-password"
  SMTP_FROM: "Tally <you@example.com>"
```

Then in **Settings → Notifications**:

1. Enter your **notification email address**.
2. Enable *"Also send upcoming payments by email"*.
3. **Send test now** to verify.

If SMTP is not configured on the server, email is simply skipped.

## Optional cron endpoint

A per-user token endpoint also exists for external schedulers (usually not
needed since the built-in scheduler covers it):

```bash
curl "http://host:6400/api/notify?token=YOUR_TOKEN"
```
