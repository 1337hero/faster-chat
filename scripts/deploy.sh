#!/bin/bash
# Bare-metal deploy. Runs on the server: pull, install, build, backup DB, restart.
# Overridable: FC_APP_DIR, FC_SERVICE, BUN.
set -eu

APP_DIR="${FC_APP_DIR:-$HOME/Sites/fasterchat.ai/app}"
SERVICE="${FC_SERVICE:-fasterchat}"
BUN="${BUN:-$HOME/.bun/bin/bun}"

main() {
  cd "$APP_DIR"

  echo "==> Pulling latest..."
  old=$(git rev-parse --short HEAD)
  git pull --ff-only origin main
  new=$(git rev-parse --short HEAD)
  [ "$old" = "$new" ] && echo "Already up to date ($new)" || git log --oneline "$old..$new"

  echo "==> Installing deps..."
  "$BUN" install --frozen-lockfile

  echo "==> Building frontend..."
  "$BUN" run build:frontend

  # Migrations run (and can rewrite tables) on next boot — snapshot the DB first
  db="server/data/chat.db"
  if [ -f "$db" ]; then
    echo "==> Backing up database..."
    cp "$db" "$db.backup-$(date +%Y%m%d-%H%M%S)"
    ls -t "$db".backup-* | tail -n +6 | xargs -r rm --   # keep 5 most recent
  fi

  echo "==> Restarting service..."
  doas rc-service "$SERVICE" restart

  echo "==> Health check..."
  port=$(grep -s '^PORT=' server/.env | cut -d= -f2)
  port="${port:-3001}"
  for _ in $(seq 1 15); do
    code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:$port/api/auth/session" || true)
    if [ "$code" = "401" ] || [ "$code" = "200" ]; then
      echo "OK — server up on :$port (HTTP $code), deployed $new"
      exit 0
    fi
    sleep 1
  done

  echo "FAILED — no response on :$port after 15s. Check: tail -50 /var/log/fasterchat.log" >&2
  exit 1
}

# main() wrapper: git pull rewriting this file mid-run can't corrupt execution
main "$@"
