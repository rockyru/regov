# RE:GOV: the Next.js app and the pipeline, with Chromium for crawling, audits and exports.
FROM mcr.microsoft.com/playwright:v1.64.1-noble
ENV NODE_ENV=production PLAYWRIGHT_BROWSERS_PATH=/ms-playwright NEXT_TELEMETRY_DISABLED=1 PORT=3000
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --include=dev --no-audit --no-fund
COPY . .
RUN npm run build
EXPOSE 3000
# Jobs restore from R2 on first use when R2_* is set (src/lib/jobs.ts).
CMD ["npx", "next", "start", "-p", "3000", "-H", "0.0.0.0"]
