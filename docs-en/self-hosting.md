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
    # Update while on stable
    git pull --ff-only
    docker compose up -d --build
    ```

    **Switching back from `main` or a version tag.** Run these commands in the existing Tally checkout. A plain `git pull` on `main` updates the development branch.

    ```bash
    git remote set-branches --add origin stable
    git fetch origin
    git switch stable
    git pull --ff-only
    docker compose up -d --build
    ```

    The first two commands also make `stable` available in a single-branch clone. If the development build already migrated the database beyond what the stable release supports, restore the backup taken before switching to development.

=== "Pin a version"

    Use a tag to pin to a specific release. If you roll back, restore the
    database backup taken before the upgrade.

    ```bash
    git fetch --tags
    git switch --detach v1.2.0
    docker compose up -d --build
    ```

=== "Development build (main)"

    Try the latest in-development code (not guaranteed to be stable).

    ```bash
    git remote set-branches --add origin main
    git fetch origin
    git switch main
    git pull --ff-only
    docker compose up -d --build
    ```

## Where data is stored

By default, the DB and backups are stored in a Docker-managed named volume
(`tally-data`). If you want to **use any host directory, such as external
storage**, just set `TALLY_DATA_DIR` to the host path in `.env` to switch.

```bash
# 1. Create the destination directory
sudo mkdir -p /mnt/storage/tally/data
```

Set this in `.env`.

```dotenv
TALLY_DATA_DIR=/mnt/storage/tally/data
```

Start Tally.

```bash
docker compose up -d --build
```

This places `/mnt/storage/tally/data/tally.db` (the DB) and `.../backups/`
(automatic backups) in that directory. The previous volume still contains
its existing data. Keep `DATABASE_URL` set to `file:/data/tally.db` (`/data` is the path inside the container; `TALLY_DATA_DIR` determines
what it actually points to).

!!! warning "SQLite and network storage"
    A **locally mounted disk** is recommended for the storage destination.
    Network filesystems such as NFS / SMB can make SQLite's file locking
    unstable.

!!! note "Migrating existing data"
    If you're already running on the named volume, stop Tally first, then copy
    `tally.db` to the new directory before switching over (e.g.
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
docker compose stop tally
docker compose cp tally:/data/tally.db ./tally-backup.db
docker compose up -d
```

Restore by putting the file back into the volume and restarting. The app's
**CSV / JSON export** also gives you a portable copy of your subscriptions.

## Security checklist

These defaults apply to `v1.2.0` and later.

- Keep `SESSION_SECRET` stable and private.
- Keep `DISABLE_REGISTRATION=1` unless you want to allow additional users. The first account remains available for setup.
- Compose publishes the port on all host interfaces by default. To restrict it, set `TALLY_BIND_ADDRESS` to `127.0.0.1` or a specific LAN or Tailscale IP.
- For HTTPS behind a proxy, set `TALLY_PUBLIC_URL` to the external origin. Pass the original HTTPS scheme through the proxy.
- Allow custom webhook origins and per-user SMTP destinations explicitly. See [Notifications](notifications.md).

### Upgrading to the hardened build

After upgrading, sign in again and reauthorize OAuth clients. For old MCP URLs containing a key, switch to `/api/mcp` with an Authorization header. Existing API keys still work in the header after Docker migrates them. See [MCP integration](mcp.md).

## Forgot your password

Tally has no built-in password recovery. Clearing the password hash will prevent login.

## Timezone

Notifications are sent based on the container's timezone. Set `TZ` (default
`Asia/Tokyo`) in `docker-compose.yml` or `.env`.
