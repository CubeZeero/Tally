---
icon: lucide/server
---

# Self-Hosting

## Updating

Tally applies additive schema migrations automatically on start, so your data
is preserved when you update. Releases are tracked on the `stable` branch and
version tags (e.g. `v1.0.0`).

=== "Follow the stable branch (recommended)"

    Uses the `stable` branch, which always ships the latest verified release.

    ```bash
    # First time
    git clone -b stable https://github.com/CubeZeero/Tally.git
    cd Tally
    # Update
    git pull
    docker compose up -d --build
    ```

=== "Pin a version"

    Use a tag if you want to pin to a specific release or roll back to an
    earlier one.

    ```bash
    git fetch --tags
    git checkout v1.0.0
    docker compose up -d --build
    ```

=== "Development build (main)"

    Try the latest in-development code (not guaranteed to be stable).

    ```bash
    git checkout main && git pull
    docker compose up -d --build
    ```

## Where data is stored

By default, the DB and backups are stored in a Docker-managed named volume
(`tally-data`). If you want to **use any host directory, such as external
storage**, just set `TALLY_DATA_DIR` to the host path in `.env` to switch.

```bash
# 1. Create the destination directory
sudo mkdir -p /mnt/storage/tally/data

# 2. Set it in .env
echo "TALLY_DATA_DIR=/mnt/storage/tally/data" >> .env

# 3. Start (recreates the existing container)
docker compose up -d --build
```

This places `/mnt/storage/tally/data/tally.db` (the DB) and `.../backups/`
(automatic backups) in that directory, so no data remains on the server's
internal disk. `DATABASE_URL` stays at `file:/data/tally.db` — no change
needed (`/data` is the path inside the container; `TALLY_DATA_DIR` determines
what it actually points to).

!!! warning "SQLite and network storage"
    A **locally mounted disk** is recommended for the storage destination.
    Network filesystems such as NFS / SMB can make SQLite's file locking
    unstable.

!!! note "Migrating existing data"
    If you're already running on the named volume, copy `tally.db` to the
    new directory before switching over (e.g.
    `docker compose cp tally:/data/tally.db /mnt/storage/tally/data/tally.db`).

## Backups

### Automatic backups

Tally periodically creates **consistent backups** using SQLite's
`VACUUM INTO` (enabled by default). They're stored in `backups/` within the
same volume as the data (e.g. `/data/backups/tally-YYYYMMDD-HHmmss.db`), and
older generations are cleaned up automatically.

- The interval, number of generations, and destination are configurable via
  environment variables (see [Getting Started](getting-started.md)):
  `BACKUP_ENABLED` / `BACKUP_INTERVAL_HOURS` / `BACKUP_KEEP` / `BACKUP_DIR`
- Check the status under **Settings → Backups**, where you can also trigger
  a manual "Back up now."

Since backups live inside the volume, copy the whole volume (or copy to a
backup destination on the host) to keep them safe:

```bash
docker compose cp tally:/data/backups ./tally-backups
```

### Manual backup / restore

Everything is stored in a single SQLite file:

```bash
docker compose cp tally:/data/tally.db ./tally-backup.db
```

Restore by putting the file back into the volume and restarting. The app's
**CSV / JSON export** also gives you a portable copy of your subscriptions.

## Security checklist

- [x] Set a strong, fixed `SESSION_SECRET` (don't commit it).
- [x] Serve over HTTPS (reverse proxy or Tailscale). When requests arrive
      with `x-forwarded-proto: https`, the session cookie gets the `Secure`
      flag.
- [x] After creating your account, disable new sign-ups with
      `DISABLE_REGISTRATION=1`.
- [x] Outgoing webhooks (Discord / generic / ntfy) allow any host — you
      manage the URL yourself (Slack is restricted to `hooks.slack.com`
      only).
- [x] Passwords are hashed with bcrypt; sessions use signed JWTs.

!!! warning "Exposing your instance to the internet"
    Registration is open by default so initial setup is possible. If your
    instance is reachable from the internet, lock it down with
    `DISABLE_REGISTRATION=1` as soon as you've created your own account.

## Forgot your password

You can list users or clear a password hash to reset it (set a new one at
the next login). Example — list usernames:

```bash
docker compose exec -T tally node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.user.findMany().then(u=>{console.log(u.map(x=>x.username));return p.\$disconnect()})"
```

## Timezone

Notifications are sent based on the container's timezone. Set `TZ` (default
`Asia/Tokyo`) in `docker-compose.yml` or `.env`.
