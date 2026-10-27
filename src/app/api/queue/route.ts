import { queueStrip } from "@/lib/queueStrip";

export const dynamic = "force-dynamic";

/** Polled by the home page's queue strip. */
export async function GET() {
  return Response.json(await queueStrip(), { headers: { "cache-control": "no-store" } });
}
