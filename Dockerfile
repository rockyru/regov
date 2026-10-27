# RE:GOV — Next.js app + pipeline (Playwright Chromium, sharp). linux/amd64 for Cloudflare Containers.
FROM mcr.microsoft.com/playwright:v1.64.1-noble
ENV NODE_ENV=production PLAYWRIGHT_BROWSERS_PATH=/ms-playwright NEXT_TELEMETRY_DISABLED=1 PORT=3000
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=dev --no-audit --no-fund
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["sh", "-c", "node node_modules/tsx/dist/cli.mjs scripts/sync-jobs.ts pull core; exec npx next start -p 3000 -H 0.0.0.0"]
