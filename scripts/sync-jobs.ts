// Persist job artifacts in R2 (S3 API) so container restarts keep the sites.
//   npx tsx scripts/sync-jobs.ts push <jobId>     upload one job
//   npx tsx scripts/sync-jobs.ts pull [core|shots] restore jobs (container boot: core first, shots after)
import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { readdir, readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { join, relative, dirname } from "node:path";

const { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET = "regov-jobs" } = process.env;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? process.env.CLOUDFLARE_ACCOUNT_ID;
const ROOT = "jobs";
const SKIP = /^(html|models)\//; // regenerable, keeps uploads small

function client() {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) return null;
  return new S3Client({ region: "auto", endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY } });
}
async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p))); else out.push(p);
  }
  return out;
}
export async function pushJob(jobId: string) {
  const s3 = client(); if (!s3) { console.log("[sync] R2 not configured, skipping"); return; }
  const dir = join(ROOT, jobId);
  const files = (await walk(dir)).filter((f) => !SKIP.test(relative(dir, f)));
  for (const f of files) await s3.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: `${jobId}/${relative(dir, f)}`, Body: await readFile(f) }));
  console.log(`[sync] pushed ${files.length} files for ${jobId}`);
}
export async function pushFile(key: string, body: string | Buffer) {
  const s3 = client(); if (!s3) return;
  await s3.send(new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, Body: body }));
}
export async function getFile(key: string): Promise<string | null> {
  const s3 = client(); if (!s3) return null;
  try { const g = await s3.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key })); return await g.Body!.transformToString(); } catch { return null; }
}
// Downloads run in parallel. "core" restores what pages need to render (status, site, assets) and
// blocks boot; "shots" restores the source screenshots (most of the bytes) after the server is up.
const SHOTS = /^[^/]+\/shots\//;
export async function pullAll(part: "all" | "core" | "shots" = "all") {
  const s3 = client(); if (!s3) { console.log("[sync] R2 not configured, skipping"); return; }
  const keys: { key: string; size: number }[] = [];
  let token: string | undefined;
  do {
    const r = await s3.send(new ListObjectsV2Command({ Bucket: R2_BUCKET, ContinuationToken: token }));
    for (const o of r.Contents ?? []) {
      if (!o.Key || (part === "core" && SHOTS.test(o.Key)) || (part === "shots" && !SHOTS.test(o.Key))) continue;
      keys.push({ key: o.Key, size: o.Size ?? 0 });
    }
    token = r.IsTruncated ? r.NextContinuationToken : undefined;
  } while (token);
  let n = 0, i = 0;
  const worker = async () => {
    while (i < keys.length) {
      const { key, size } = keys[i++];
      const dest = join(ROOT, key);
      try { const st = await stat(dest); if (st.size === size) continue; } catch { /* missing */ }
      try {
        const g = await s3.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: key }));
        await mkdir(dirname(dest), { recursive: true });
        await writeFile(dest, Buffer.from(await g.Body!.transformToByteArray()));
        n++;
      } catch (e) { console.error(`[sync] ${key}:`, (e as Error).message); }
    }
  };
  await Promise.all(Array.from({ length: 24 }, worker));
  console.log(`[sync] restored ${n} of ${keys.length} ${part} files`);
}
const [cmd, arg] = process.argv.slice(2);
if (cmd === "push" && arg) pushJob(arg).catch((e) => { console.error(e); process.exit(1); });
else if (cmd === "pull") pullAll((arg as "core" | "shots") || "all").catch((e) => console.error("[sync] pull failed:", (e as Error).message));
