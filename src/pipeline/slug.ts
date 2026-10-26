/** Stable page slug from a URL; query strings (?page=forms sites) become part of it. */
export const slugOf = (url: string) => {
  const u = new URL(url);
  const p = u.pathname.replace(/^\/|\/$/g, "").replace(/\.(php|html?|aspx?)$/i, "");
  const q = [...u.searchParams.entries()].filter(([k]) => !/^(utm_|fbclid|gclid)/.test(k)).map(([k, v]) => `${k}-${v}`).join("-");
  const slug = [p, q].filter(Boolean).join("/").toLowerCase().replace(/[^a-z0-9/]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return slug === "" ? "home" : slug;
};
