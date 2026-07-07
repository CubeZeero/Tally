---
icon: lucide/circle-help
---

# FAQ

??? question "Is Tally single-user or multi-user?"
    Multi-user. Each account has its own subscriptions, categories, payment
    methods, and settings. The first account claims any pre-existing data.

??? question "I get logged out every time the container restarts."
    You haven't set a stable `SESSION_SECRET`, so Tally uses a random
    per-process secret. Set `SESSION_SECRET` (e.g. in a `.env` file) — see
    [Configuration](configuration.md).

??? question "Login works but navigating bounces me back to the login page."
    This happens when accessing over plain HTTP with a `Secure` cookie. Tally
    only marks the cookie `Secure` when it sees `x-forwarded-proto: https`, so
    direct HTTP (e.g. a Tailscale IP) works. If you use a reverse proxy, make
    sure it forwards that header for HTTPS.

??? question "Email notifications aren't sending."
    Email requires server-side SMTP settings (`SMTP_HOST`, etc.). Without them,
    email is skipped and only Discord is used. See [Notifications](notifications.md).

??? question "How do I stop other people from registering?"
    Create your account, then set `DISABLE_REGISTRATION=1` and restart. The very
    first account is always allowed so the instance can be set up.

??? question "Docker says it can't connect to the daemon (Colima)."
    If you use Colima, start it with `colima start` (or `brew services start
    colima` to auto-start), then `docker compose up -d`.

??? question "Where is my data stored?"
    In a single SQLite file inside the `tally-data` volume
    (`/data/tally.db` in the container). Back it up by copying that file.

??? question "How do I change the language?"
    Pick it at sign-up, or change it later in **Settings → Language**. It's saved
    per user; default categories/payment methods are seeded in that language.
