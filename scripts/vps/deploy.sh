#!/usr/bin/env bash
# Zero-rebuild-downtime deploy on the VPS. Runs as root on the server:
#   ssh root@72.62.255.82 'bash -s' < scripts/vps/deploy.sh          (refuses while runs are in flight)
#   ssh root@72.62.255.82 'FORCE=1 bash -s' < scripts/vps/deploy.sh  (deploy anyway; in-flight runs are lost)
# Layout: /home/regov/releases/<stamp> (one checkout per deploy), /home/regov/current -> live release,
# /home/regov/jobs and /home/regov/.env shared by every release.
set -euo pipefail
H=/home/regov
REPO=${REPO:-https://github.com/rockyru/regov.git}
BRANCH=${BRANCH:-main}

busy=$(curl -s -m 5 http://127.0.0.1:3000/api/run | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const q=JSON.parse(s);console.log(q.running+q.waiting)}catch{console.log(0)}})')
if [ "${busy:-0}" != "0" ] && [ -z "${FORCE:-}" ]; then echo "refusing: $busy run(s) in flight. Wait, or rerun with FORCE=1."; exit 1; fi

R=$H/releases/$(date +%Y%m%d-%H%M%S)
sudo -u regov -H bash -lc "set -e
git clone -q --depth 1 -b $BRANCH $REPO $R
cd $R && git log --oneline -1
ln -s $H/.env .env
npm ci --include=dev --no-audit --no-fund --loglevel=error
npm run build > build.log 2>&1 || { tail -30 build.log; exit 1; }
# After the build: Turbopack refuses symlinks that leave the project, and the build never reads job data.
ln -s $H/jobs jobs
npx playwright install chromium > /dev/null"
ln -sfn "$R" $H/current
systemctl restart regov
sleep 4
curl -s -m 10 -o /dev/null -w "live: %{http_code}\n" http://127.0.0.1:3000/
# Keep the last three releases for a quick rollback (ln -sfn <older release> /home/regov/current && systemctl restart regov).
ls -1dt $H/releases/* | tail -n +4 | xargs -r rm -rf
