#!/usr/bin/env bash
# Runs the Supabase migrations and RLS tests on a throwaway local PostgreSQL.
# Needs PostgreSQL 15+ binaries (initdb, pg_ctl, psql).
set -euo pipefail
cd "$(dirname "$0")/.."
BIN=${PG_BIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}
DIR=$(mktemp -d)
RUN=(); [ "$(id -u)" = 0 ] && { chown postgres "$DIR"; RUN=(runuser -u postgres --); }
"${RUN[@]}" "$BIN/initdb" -D "$DIR/data" -U postgres -A trust >/dev/null
"${RUN[@]}" "$BIN/pg_ctl" -D "$DIR/data" -o "-p 54329 -k $DIR -c listen_addresses=''" -l "$DIR/log" -w start >/dev/null
trap '"${RUN[@]}" "$BIN/pg_ctl" -D "$DIR/data" -m immediate stop >/dev/null; rm -rf "$DIR"' EXIT
PSQL=(psql -h "$DIR" -p 54329 -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -f supabase/tests/stub_auth.sql
for f in supabase/migrations/*.sql; do "${PSQL[@]}" -f "$f"; done
"${PSQL[@]}" -t -f supabase/tests/rls_test.sql 2>&1 | grep -v "^\s*$" | sed 's/^psql:[^:]*:[0-9]*: NOTICE:  //'
