#!/bin/sh
set -e

# Use environment variables with defaults
TS_AUTHKEY=${TS_AUTHKEY:-}
TS_LOGIN_SERVER=${TS_LOGIN_SERVER:-https://controlplane.tailscale.com}
TS_EXIT_NODE=${TS_EXIT_NODE:-}
TS_HOSTNAME=${TS_HOSTNAME:-$(hostname)}
TS_TAGS=${TS_TAGS:-tag:proxy}
TS_SOCKS5_PORT=${TS_SOCKS5_PORT:-1080}
TS_EXIT_NODE_ALLOW_LAN=${TS_EXIT_NODE_ALLOW_LAN:-false}
TS_ACCEPT_ROUTES=${TS_ACCEPT_ROUTES:-true}
TS_ACCEPT_DNS=${TS_ACCEPT_DNS:-false}

echo "[init] Starting tailscaled for ${TS_HOSTNAME}..."
tailscaled --tun=userspace-networking \
    --socks5-server=0.0.0.0:${TS_SOCKS5_PORT} \
    --state=${TS_STATE_DIR}/tailscaled.state &

echo "[init] Waiting for tailscaled to initialize SOCKS5..." && sleep 5

echo "[init] Running tailscale up with login server: ${TS_LOGIN_SERVER}..."
tailscale up \
    --login-server=${TS_LOGIN_SERVER} \
    --authkey=${TS_AUTHKEY} \
    --hostname=${TS_HOSTNAME} \
    --advertise-tags=${TS_TAGS} \
    --accept-routes=${TS_ACCEPT_ROUTES} \
    --accept-dns=${TS_ACCEPT_DNS} \
    --exit-node-allow-lan-access=${TS_EXIT_NODE_ALLOW_LAN} \
    --force-reauth \
    $([ -n "${TS_EXIT_NODE}" ] && echo "--exit-node=${TS_EXIT_NODE}")

echo "[init] SOCKS5 proxy available on port ${TS_SOCKS5_PORT}"
echo "[init] Proxy ready: ${TS_HOSTNAME} (${TS_LOGIN_SERVER})"
tail -f /dev/null
