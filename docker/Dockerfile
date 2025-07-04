FROM alpine:latest

RUN apk add --no-cache iputils curl iptables ip6tables bash openrc ca-certificates

RUN curl -fsSL https://pkgs.tailscale.com/stable/tailscale_1.84.0_amd64.tgz /tmp/ | tar -xzv \
    && mv tailscale*/tailscale tailscale*/tailscaled /usr/sbin/ && \
    chmod +x /usr/sbin/tailscale /usr/sbin/tailscaled

COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]