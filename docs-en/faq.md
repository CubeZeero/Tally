---
icon: lucide/circle-help
---

# FAQ

??? question "Is Tally single-user or multi-user?"
    Multi-user. Each account keeps its own subscriptions, categories, payment
    methods, and settings. The first account inherits any existing data.

??? question "I'm logged out every time the container restarts."
    You haven't set a fixed `SESSION_SECRET`, so Tally is using a random
    per-process key. Set `SESSION_SECRET` (e.g. in your `.env` file). See
    [Getting started](getting-started.md) for details.

??? question "I can log in, but I'm sent back to the login screen when I navigate."
    This happens when a `Secure` cookie is accessed over HTTP. Tally only
    attaches `Secure` to the cookie when it detects `x-forwarded-proto: https`,
    so it also works over plain HTTP (e.g. a Tailscale IP). If you're using a
    reverse proxy, configure it to forward this header over HTTPS.

??? question "Email notifications aren't being sent."
    Email requires SMTP configuration. Set it up per-user under **Settings →
    Notifications → Email notifications**, or use the server's environment
    variables (`SMTP_HOST`, etc.) as a fallback. If neither is set, email is
    skipped. See [Notifications](notifications.md) for details.

??? question "Can I see payment dates in a calendar app?"
    Yes. Issue a feed URL under **Settings → iCal calendar integration** and
    subscribe to it from Google, Apple, or other calendar apps. See
    [Features](features.md) for details.

??? question "Are there automatic backups?"
    Yes. SQLite is backed up safely on a regular schedule (enabled by default,
    stored in `backups/` inside the volume). Adjust the interval and retention
    count with the `BACKUP_*` environment variables, and you can also run a
    manual backup from **Settings → Backup**. See [Self-hosting](self-hosting.md)
    for details.

??? question "Is there a mobile app?"
    Tally is a **PWA**, so you can install it like an app using your browser's
    "Add to Home Screen" option (push notifications are not used).

??? question "How do I stop other people from signing up?"
    After creating your own account, set `DISABLE_REGISTRATION=1` and restart.
    The first account can always be created, for initial setup.

??? question "It says it can't connect to Docker (Colima)."
    If you're using Colima, start it with `colima start` (or
    `brew services start colima` if you want it to start automatically), then
    run `docker compose up -d`.

??? question "Where is data stored?"
    By default, everything is in a single SQLite file (`/data/tally.db` inside
    the container) within the `tally-data` volume. Back it up by copying this
    file. To place it on a different host directory, such as external storage,
    set `TALLY_DATA_DIR` in `.env` (see [Self-hosting](self-hosting.md)).

??? question "How do I change the language?"
    Choose it at sign-up, or change it later under **Settings → Language**.
    It's saved per user, and the default categories / payment methods are
    initialized in that language.
