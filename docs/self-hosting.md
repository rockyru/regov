# Self-hosting

RE:GOV runs anywhere Node 22 and Chromium can run. It needs about 2 GB of memory per concurrent
rebuild and keeps every job on local disk.

## Docker

```bash
cp .env.example .env          # set MODEL_API_KEY and ADMIN_TOKEN at least
docker compose up -d --build  # http://localhost:3000
```

`compose.yaml` keeps jobs in the `jobs` volume. Put a reverse proxy with HTTPS in front of it
(Caddy, nginx, Cloudflare Tunnel). The proxy must pass the `Host` header through: the feedback
form only accepts posts from the site's own origin.

## A plain server

This is how regov.app runs (`scripts/vps/`):

1. Node 22, `npx playwright install --with-deps chromium`.
2. Each deploy clones `main` into `releases/<timestamp>`, runs `npm ci` and `npm run build`, links
   a shared `.env` and a shared `jobs/` folder into it, and points `current` at it.
3. A systemd service runs `next start -p 3000` from `current`; Caddy proxies to it.
4. `deploy.sh` refuses to restart while rebuilds are running.

`harden.sh` locks the server down: SSH keys only, ports 80 and 443 open only to Cloudflare,
fail2ban, security headers and a sandboxed service.

## Settings

All settings are environment variables, listed in `.env.example`. The important ones:

| Variable | Why |
| --- | --- |
| `MODEL_API_KEY`, `MODEL_API_BASE`, `MUSE_MODEL`, `SAM_MODEL`, `IMAGE_MODEL` | Models ([models.md](models.md)) |
| `ADMIN_TOKEN` | Turns on `/admin` and `/edit` (16+ characters) |
| `RUN_DAILY_MAX`, `RUN_CONCURRENCY`, `RUN_QUEUE_MAX`, `RUN_RATE_LIMIT` | Cost and abuse limits (README) |
| `SUBMISSIONS=paused` | Stop accepting new runs without a deploy |
| `PUBLIC_ORIGIN` | Your own address, for links in exports and emails |
| `R2_*` | Optional backup of jobs to Cloudflare R2 |
| `FEEDBACK_TO`, `FEEDBACK_FROM`, `CLOUDFLARE_EMAIL_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | Optional email delivery of feedback |
| `OPT_OUT_DOMAINS` | More domains to refuse, comma-separated |

## If you host it publicly

Keep the unofficial labels and the disclaimers, honour opt-out requests, and set a daily
allowance you can afford: each rebuild spends model credit.
