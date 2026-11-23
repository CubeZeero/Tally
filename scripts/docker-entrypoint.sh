#!/bin/sh
set -eu

umask 077
if [ "$(id -u)" = 0 ]; then
  # Migrate only Tally-owned paths from images that ran as root.
  chown -h node:node /data
  for file in /data/tally.db /data/tally.db-wal /data/tally.db-shm /data/tally.db-journal /data/backups; do
    if [ -e "$file" ] && [ ! -L "$file" ]; then
      chown -h node:node "$file"
    fi
  done
  exec gosu node sh "$0" "$@"
fi

node init-db.mjs
exec "$@"
