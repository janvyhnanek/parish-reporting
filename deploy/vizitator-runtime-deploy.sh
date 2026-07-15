#!/usr/bin/env bash
set -euo pipefail

APP_DIR="/home/jann/parish-reporting"
PORT="${PORT:-8788}"
DOMAIN="vizitator.cz"
WWW_DOMAIN="www.vizitator.cz"
LOG_FILE="/tmp/vizitator.log"
PID_FILE="/tmp/vizitator.pid"
CADDY_CONFIG="/tmp/caddy-vizitator.json"

cd "${APP_DIR}"

if [[ ! -f "${APP_DIR}/dist/client/index.html" ]]; then
  npm run build
fi

if [[ -f "${PID_FILE}" ]] && kill -0 "$(cat "${PID_FILE}")" 2>/dev/null; then
  kill "$(cat "${PID_FILE}")"
  sleep 1
fi

if ss -ltnp | grep -q ":${PORT} "; then
  ss -ltnp | grep ":${PORT} " >&2
  echo "Port ${PORT} is already in use by another process." >&2
  exit 1
fi

setsid -f env NODE_ENV=production PORT="${PORT}" node --import tsx server/index.ts >"${LOG_FILE}" 2>&1
sleep 2
pgrep -f "node --import tsx server/index.ts" | tail -n 1 >"${PID_FILE}"

curl -fsS http://127.0.0.1:2019/config/ > /tmp/caddy-current.json

node - <<'NODE'
const fs = require("fs");
const config = JSON.parse(fs.readFileSync("/tmp/caddy-current.json", "utf8"));
const routes = config.apps.http.servers.srv0.routes || [];
const withoutVizitator = routes.filter((route) => {
  const hosts = route.match?.flatMap((match) => match.host || []) || [];
  return !hosts.includes("vizitator.cz") && !hosts.includes("www.vizitator.cz");
});

const vizitatorRoutes = [
  {
    match: [{ host: ["www.vizitator.cz"] }],
    handle: [{
      handler: "subroute",
      routes: [{
        handle: [{
          handler: "static_response",
          status_code: 301,
          headers: { Location: ["https://vizitator.cz{http.request.uri}"] },
        }],
      }],
    }],
    terminal: true,
  },
  {
    match: [{ host: ["vizitator.cz"] }],
    handle: [{
      handler: "subroute",
      routes: [{
        handle: [
          {
            handler: "headers",
            response: {
              set: {
                "X-Content-Type-Options": ["nosniff"],
                "Referrer-Policy": ["strict-origin-when-cross-origin"],
                "Permissions-Policy": ["geolocation=(), microphone=(), camera=()"],
              },
            },
          },
          {
            handler: "reverse_proxy",
            upstreams: [{ dial: "127.0.0.1:8788" }],
          },
        ],
      }],
    }],
    terminal: true,
  },
];

config.apps.http.servers.srv0.routes = [...vizitatorRoutes, ...withoutVizitator];
fs.writeFileSync("/tmp/caddy-vizitator.json", JSON.stringify(config));
NODE

curl -fsS -X POST http://127.0.0.1:2019/load \
  -H "Content-Type: application/json" \
  --data-binary @"${CADDY_CONFIG}"

curl -fsSI "https://${DOMAIN}" >/dev/null
curl -fsS "https://${DOMAIN}/api/metadata" >/dev/null

echo "Vizitator deployed on https://${DOMAIN}"
