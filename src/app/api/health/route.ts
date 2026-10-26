import os from "node:os";
import { readdir } from "node:fs/promises";
import { JOBS_ROOT } from "@/lib/jobs";

const BOOT = new Date().toISOString();

/** Container diagnostics: uptime, memory, running jobs. */
export async function GET() {
  const m = process.memoryUsage();
  let jobs: string[] = [];
  try { jobs = (await readdir(JOBS_ROOT)).filter((d) => !d.startsWith(".")); } catch { /* none */ }
  return Response.json({
    boot: BOOT, uptime_s: Math.round(process.uptime()),
    rss_mb: Math.round(m.rss / 1048576), heap_mb: Math.round(m.heapUsed / 1048576),
    os_total_mb: Math.round(os.totalmem() / 1048576), os_free_mb: Math.round(os.freemem() / 1048576), load: os.loadavg().map((x) => +x.toFixed(2)),
    jobs,
  });
}
