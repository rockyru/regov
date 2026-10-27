/** Language switch for the rebuilt sites: remember the choice in a cookie and go back to the page. */
export function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const lang = q.get("l") === "fil" ? "fil" : "en";
  const back = q.get("back") ?? "";
  const to = /^\/preview\/[\w.-]+(\/[^\s]*)?$/.test(back) && !back.startsWith("//") ? back : "/";
  return new Response(null, { status: 303, headers: { Location: to, "Set-Cookie": `regov_lang=${lang}; Path=/; Max-Age=31536000; SameSite=Lax`, "cache-control": "no-store" } });
}
