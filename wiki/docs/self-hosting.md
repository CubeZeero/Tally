---
icon: lucide/server
---

# Self-hosting

## Updating

Tally applies additive schema migrations automatically on start, so your data is
preserved across updates.

```bash
git pull
docker compose up -d --build
```

## Backup

Everything lives in one SQLite file:

```bash
docker compose cp tally:/data/tally.db ./tally-backup.db
```

Restore by copying the file back into the volume and restarting. You can also use
the in-app **CSV / JSON export** for a portable copy of your subscriptions.

## Security checklist

- [x] Set a strong, stable `SESSION_SECRET` (never commit it).
- [x] Serve over HTTPS (reverse proxy or Tailscale). The session cookie is
      marked `Secure` when the request arrives via `x-forwarded-proto: https`.
- [x] After creating your account, set `DISABLE_REGISTRATION=1` to stop sign-ups.
- [x] Discord webhook URLs are validated to `discord.com` (SSRF protection).
- [x] Passwords are hashed with bcrypt; sessions are signed JWTs.

!!! warning "Public exposure"
    Registration is open by default so a fresh instance can be set up. If your
    instance is reachable from the internet, lock it down with
    `DISABLE_REGISTRATION=1` right after creating your account.

## Reset a forgotten password

List users, or reset a password by clearing its hash (the user then sets a new
one). Example — list usernames:

```bash
docker compose exec -T tally node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.user.findMany().then(u=>{console.log(u.map(x=>x.username));return p.\$disconnect()})"
```

## Timezone

The notification send time uses the container timezone. Set `TZ` (default
`Asia/Tokyo`) in `docker-compose.yml` or your `.env`.
