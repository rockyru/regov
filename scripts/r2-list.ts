// List job artifacts in the R2 bucket.   npx tsx --env-file=.env scripts/r2-list.ts [prefix]
import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";
async function main() {
  const e = process.env;
  const s3 = new S3Client({ region: "auto", endpoint: `https://${e.R2_ACCOUNT_ID ?? e.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: e.R2_ACCESS_KEY_ID!, secretAccessKey: e.R2_SECRET_ACCESS_KEY! } });
  const r = await s3.send(new ListObjectsV2Command({ Bucket: e.R2_BUCKET ?? "regov-jobs", Prefix: process.argv[2] ?? "" }));
  const keys = (r.Contents ?? []).map((o) => o.Key!);
  console.log(`${keys.length} objects; jobs: ${[...new Set(keys.map((k) => k.split("/")[0]))].join(", ")}`);
  if (process.argv[2]) console.log(keys.join("\n"));
}
main().catch((e) => { console.error(e.message); process.exit(1); });
