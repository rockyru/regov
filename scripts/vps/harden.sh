#!/usr/bin/env bash
# One-time (and safe to re-run) hardening for the VPS. Runs as root on the server:
#   ssh root@72.62.255.82 'bash -s' < scripts/vps/harden.sh
# Keys-only SSH, web ports open to Cloudflare only, fail2ban, security headers, a sandboxed app service.
set -euo pipefail

echo "== ssh: keys only"
cat > /etc/ssh/sshd_config.d/00-regov-hardening.conf <<'EOF'
# sshd keeps the first value it reads, so this file (00-) wins over cloud-init's defaults.
PermitRootLogin prohibit-password
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitEmptyPasswords no
X11Forwarding no
AllowAgentForwarding no
MaxAuthTries 3
LoginGraceTime 30
ClientAliveInterval 300
ClientAliveCountMax 2
EOF
sshd -t && systemctl reload ssh

echo "== firewall: 80/443 from Cloudflare only"
cat > /usr/local/sbin/cf-ufw-sync <<'EOF'
#!/usr/bin/env bash
# Allow 80/443 only from Cloudflare, so nobody can skip the CDN or spoof cf-connecting-ip.
# Leaves the rules alone if the published lists look wrong.
set -euo pipefail
v4=$(curl -fsS -m 20 https://www.cloudflare.com/ips-v4)
v6=$(curl -fsS -m 20 https://www.cloudflare.com/ips-v6)
if [ "$(grep -cE '^[0-9.]+/[0-9]+$' <<<"$v4")" -lt 10 ] || [ "$(grep -cE '^[0-9a-f:]+/[0-9]+$' <<<"$v6")" -lt 5 ]; then
  echo "cloudflare ip lists look wrong, leaving rules alone" >&2; exit 1
fi
for r in $v4 $v6; do ufw allow proto tcp from "$r" to any port 80,443 comment cloudflare > /dev/null; done
ufw delete allow 80/tcp > /dev/null 2>&1 || true
ufw delete allow 443/tcp > /dev/null 2>&1 || true
# Remove ranges Cloudflare no longer publishes.
for src in $(ufw status | awk '/# cloudflare/ {print $3}' | sort -u); do
  grep -qxF "$src" <<<"$v4"$'\n'"$v6" || ufw delete allow proto tcp from "$src" to any port 80,443 > /dev/null
done
echo "cloudflare-only: $(ufw status | grep -c '# cloudflare') rules"
EOF
chmod 700 /usr/local/sbin/cf-ufw-sync
/usr/local/sbin/cf-ufw-sync
echo "17 4 * * 1 root /usr/local/sbin/cf-ufw-sync 2>&1 | logger -t cf-ufw-sync" > /etc/cron.d/cf-ufw-sync

echo "== packages: updates + fail2ban"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq > /dev/null
apt-get install -y -qq fail2ban python3-systemd > /dev/null
cat > /etc/fail2ban/jail.local <<'EOF'
[DEFAULT]
backend = systemd
bantime = 1h
findtime = 10m
maxretry = 5

[sshd]
enabled = true
EOF
systemctl enable -q fail2ban && systemctl restart fail2ban || echo "warning: fail2ban did not start (systemctl status fail2ban)"

echo "== caddy: security headers"
cp -n /etc/caddy/Caddyfile /etc/caddy/Caddyfile.orig
cat > /etc/caddy/Caddyfile.new <<'EOF'
{
	# Cloudflare sits in front; it may talk to us over HTTP (Flexible) or HTTPS (Full), so serve both and never redirect.
	auto_https disable_redirects
}

(app) {
	encode zstd gzip
	header {
		Strict-Transport-Security "max-age=31536000; includeSubDomains"
		X-Content-Type-Options nosniff
		X-Frame-Options SAMEORIGIN
		Referrer-Policy strict-origin-when-cross-origin
		Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=()"
		-Server
	}
	reverse_proxy 127.0.0.1:3000 {
		header_down -X-Powered-By
	}
}

https://regov.app, https://www.regov.app {
	# Let's Encrypt via HTTP-01 through Cloudflare, so SSL mode Full (strict) trusts it.
	import app
}

http:// {
	import app
}
EOF
caddy validate --adapter caddyfile --config /etc/caddy/Caddyfile.new > /dev/null
mv /etc/caddy/Caddyfile.new /etc/caddy/Caddyfile
systemctl reload caddy

echo "== app service: sandbox"
mkdir -p /etc/systemd/system/regov.service.d
cat > /etc/systemd/system/regov.service.d/hardening.conf <<'EOF'
# The app (and the Chromium it drives) can only write under /home/regov.
[Service]
NoNewPrivileges=yes
PrivateTmp=yes
PrivateDevices=yes
ProtectSystem=strict
ReadWritePaths=/home/regov
ProtectKernelTunables=yes
ProtectKernelModules=yes
ProtectKernelLogs=yes
ProtectControlGroups=yes
ProtectClock=yes
ProtectHostname=yes
RestrictSUIDSGID=yes
RestrictRealtime=yes
LockPersonality=yes
UMask=0027
EOF
systemctl daemon-reload
busy=$(curl -s -m 5 http://127.0.0.1:3000/api/run | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const q=JSON.parse(s);console.log(q.running+q.waiting)}catch{console.log(0)}})')
if [ "${busy:-0}" = "0" ]; then
  systemctl restart regov && sleep 4
  curl -s -m 10 -o /dev/null -w "live: %{http_code}\n" http://127.0.0.1:3000/
else
  echo "$busy run(s) in flight: sandbox applies on the next deploy"
fi

echo "== done"
ufw status | grep -v cloudflare
fail2ban-client status sshd 2>/dev/null | grep -E "Currently|Total" || true
