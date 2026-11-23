---
icon: lucide/play
---

# Getting Started

Tally runs as a single Docker container. Data is stored in SQLite on a
mounted volume, so it persists across restarts and updates.


Docker Compose binds to loopback by default. Set `TALLY_BIND_ADDRESS` to a reachable host IP for LAN or Tailscale.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (with the Compose plugin)
- A machine you manage yourself (a home server, a VPS, or your own PC)

## 1. Get the code

```bash
git clone -b stable https://github.com/CubeZeero/Tally.git
cd Tally
```

## 2. Set environment variables (before launch)

Copy `.env.example` to `.env` and edit it **before the first launch**.
`docker-compose.yml` reads this `.env` file for variable substitution
(`.env` is git-ignored).

```bash
cp .env.example .env

# Generate a signing key and paste it into SESSION_SECRET="" in .env
openssl rand -base64 32
```

The available environment variables are listed below. Setting `SESSION_SECRET`
alone is enough to get Tally running, but it's smoother to also decide on
`TZ`, `DISABLE_REGISTRATION`, and the backup settings **at this stage**.

| Variable | Description | Default |
| --- | --- | --- |
| `SESSION_SECRET` | Signing key for session cookies. Use a long random string (`openssl rand -base64 32`). If unset, a random per-process secret is used and sessions reset on restart. | (random per process) |
| `DATABASE_URL` | SQLite file location | `file:/data/tally.db` (Docker) |
| `TALLY_DATA_DIR` | Host directory for the data (DB + backups). Point at external storage; unset uses a Docker-managed named volume | (named volume `tally-data`) |
| `TZ` | Timezone for the notification scheduler | `Asia/Tokyo` |
| `DISABLE_REGISTRATION` | Set to `0` to allow additional accounts | `1` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | SMTP settings for email notifications (**fallback**; per-user settings take priority) | (unset) |
| `BACKUP_ENABLED` | Enable/disable automatic backups | `true` |
| `BACKUP_INTERVAL_HOURS` | Automatic backup interval (hours) | `24` |
| `BACKUP_KEEP` | Number of generations to keep (oldest deleted once exceeded) | `7` |
| `BACKUP_DIR` | Backup destination | `backups/` in the same volume as the DB |
| `UPDATE_CHECK` | Shows a "new version available" banner by comparing against the latest GitHub tag. Set to `0` to disable (stops the periodic request to api.github.com) | `1` (on) |
| `PORT` | Listening port | `6400` |

!!! important "Set `SESSION_SECRET` before launch"
    Set `SESSION_SECRET` **before the first `docker compose up`**. If you
    start Tally without it, it generates a random key per process, so
    everyone gets logged out every time the container restarts. Since the
    repository is public, don't use a hardcoded value — always generate
    your own key.

`docker-compose.yml` reads `.env` like this:

```yaml
environment:
  SESSION_SECRET: "${SESSION_SECRET:-}"
  TZ: "${TZ:-Asia/Tokyo}"
  DISABLE_REGISTRATION: "${DISABLE_REGISTRATION:-1}"
```

## 3. Build & start

```bash
docker compose up -d --build
```

Open <http://localhost:6400>. On first run, create an account (username +
password). Your data is stored only on your server.

!!! tip "The first account"
    The first account you create inherits all existing data. After that,
    set `DISABLE_REGISTRATION=0` if you want to allow further sign-ups.

??? note "Starting with `docker run`"
    If you're not using Docker Compose, pass the environment variables
    directly with `-e`.

    ```bash
    docker build -t tally .
    docker run -d \
      --name tally \
      -p 127.0.0.1:6400:6400 \
      -e SESSION_SECRET="$(openssl rand -base64 32)" \
      -e TZ="Asia/Tokyo" \
      -v tally-data:/data \
      tally
    ```

## Next steps

- Add your subscriptions from the dashboard
- Set your **main currency**, and if needed your **monthly budget** and
  **notifications** (Discord / email / webhook / Slack / ntfy) in
  [Settings](configuration.md)
- Bring payment dates into your calendar app with the **iCal feed**, and
  install Tally as a **PWA** via "Add to Home Screen" in your browser
- See [Self-Hosting](self-hosting.md) for updates, backups, and security
