"use client";
import { useEffect, useMemo, useState } from "react";
import type { SiteModel, SitePage } from "@/pipeline/schema";

type Block = SitePage["blocks"][number];
type Item = Block["items"][number];
type Entity = SiteModel["entities"][number];

const ENTITY_TYPES: Entity["type"][] = ["official", "hotline", "barangay", "program", "campus", "unit", "service_window", "facility"];
const input = "mt-1 block w-full border border-neutral-400 bg-white px-3 py-2 text-[15px] focus:border-kapwa-brand-900 focus:outline-2 focus:outline-kapwa-brand-900";
const label = "block text-[13px] font-semibold text-neutral-700";
const small = "inline-flex h-8 items-center gap-1 border border-neutral-400 px-2.5 text-[13px] font-semibold text-neutral-800 hover:border-kapwa-brand-900 hover:text-kapwa-brand-900 disabled:opacity-40";

function Field({ name, value, onChange, area, rows = 3, mono }: { name: string; value: string; onChange: (v: string) => void; area?: boolean; rows?: number; mono?: boolean }) {
  return (
    <label className="block">
      <span className={label}>{name}</span>
      {area
        ? <textarea value={value} rows={rows} onChange={(e) => onChange(e.target.value)} className={`${input} resize-y ${mono ? "font-mono text-[13px]" : ""}`} />
        : <input value={value} onChange={(e) => onChange(e.target.value)} className={input} />}
    </label>
  );
}

/**
 * Review editor for one rebuild (/edit/<job>): fix what the agent got wrong, page by page, and mark
 * each page as checked against the original. Saves the whole site.json through /api/jobs/<job>/site.
 */
export function SiteEditor({ initial, token, hasGenerated }: { initial: SiteModel; token: string; hasGenerated: boolean }) {
  const [site, setSite] = useState(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [sel, setSel] = useState<string>("@site");
  const [status, setStatus] = useState<{ kind: "ok" | "error" | "busy"; text: string } | null>(null);
  const [confirmRevert, setConfirmRevert] = useState(false);
  const [canRevert, setCanRevert] = useState(hasGenerated);
  const dirty = useMemo(() => JSON.stringify(site) !== saved, [site, saved]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener("beforeunload", warn);
    return () => removeEventListener("beforeunload", warn);
  }, [dirty]);

  /** Change a copy of the site; React sees a new object. */
  const edit = (fn: (s: SiteModel) => void) => setSite((prev) => { const next = structuredClone(prev); fn(next); return next; });
  const pageIndex = site.pages.findIndex((p) => p.slug === sel);
  const page = pageIndex >= 0 ? site.pages[pageIndex] : null;
  const editPage = (fn: (p: SitePage) => void) => edit((s) => fn(s.pages[pageIndex]));
  const reviewed = site.reviewed ?? {};
  const checked = site.pages.filter((p) => reviewed[p.slug]).length;

  async function call(body: unknown) {
    const res = await fetch(`/api/jobs/${site.jobId}/site`, { method: "PUT", headers: { "content-type": "application/json", "x-admin-token": token }, body: JSON.stringify(body) }).catch(() => null);
    return { ok: !!res?.ok, out: (await res?.json().catch(() => null)) as { error?: string; edited_at?: string } | null };
  }
  async function save() {
    setStatus({ kind: "busy", text: "Saving…" });
    const { ok, out } = await call(site);
    if (!ok) return setStatus({ kind: "error", text: out?.error ?? "Could not save. Try again." });
    const next = { ...site, edited_at: out?.edited_at };
    setSite(next);
    setSaved(JSON.stringify(next));
    setCanRevert(true);
    setStatus({ kind: "ok", text: "Saved. The preview, report and downloads now use this version." });
  }
  async function revert() {
    setConfirmRevert(false);
    setStatus({ kind: "busy", text: "Restoring…" });
    const { ok, out } = await call({ revert: true });
    if (!ok) return setStatus({ kind: "error", text: out?.error ?? "Could not restore." });
    location.reload();
  }

  const nav = (key: string, text: string, extra?: React.ReactNode) => (
    <li key={key}>
      <button type="button" onClick={() => setSel(key)} aria-current={sel === key ? "true" : undefined}
        className={`flex w-full items-start gap-2 border-l-4 px-3 py-2 text-left text-sm ${sel === key ? "border-kapwa-brand-900 bg-kapwa-brand-50 font-semibold text-kapwa-brand-900" : "border-transparent text-neutral-800 hover:bg-neutral-100"}`}>
        <span className="min-w-0 flex-1 break-words">{text}</span>{extra}
      </button>
    </li>
  );

  return (
    <div>
      <div className="sticky top-0 z-30 -mx-4 border-b border-neutral-300 bg-white/95 px-4 py-3 backdrop-blur sm:mx-0 sm:px-0">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={save} disabled={!dirty || status?.kind === "busy"} className="inline-flex h-10 items-center bg-kapwa-brand-900 px-5 text-sm font-semibold text-white hover:bg-kapwa-brand-950 disabled:opacity-50">{dirty ? "Save changes" : "Saved"}</button>
          <a href={`/preview/${site.jobId}${page && page.slug !== "home" ? `/${page.slug}` : ""}`} target="_blank" rel="noreferrer" className="text-sm font-semibold underline">Open preview ↗</a>
          <span className="text-sm text-neutral-600 tabular-nums">{checked} of {site.pages.length} pages checked</span>
          {canRevert && (confirmRevert
            ? <span className="ml-auto flex items-center gap-2 text-sm"><span>Discard every edit?</span><button type="button" onClick={revert} className={`${small} border-kapwa-red-700 text-kapwa-red-700`}>Yes, restore</button><button type="button" onClick={() => setConfirmRevert(false)} className={small}>Cancel</button></span>
            : <button type="button" onClick={() => setConfirmRevert(true)} className={`${small} ml-auto`}>Restore the agent&rsquo;s version</button>)}
        </div>
        {status && <p role={status.kind === "error" ? "alert" : "status"} className={`mt-2 text-sm ${status.kind === "error" ? "font-semibold text-kapwa-red-700" : "text-neutral-700"}`}>{status.text}</p>}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[18rem_1fr]">
        <nav aria-label="Parts of the site" className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
          <ul className="border-y border-neutral-200">
            {nav("@site", "Site details")}
            {nav("@entities", `People, hotlines and offices (${site.entities.length})`)}
          </ul>
          <p className="mt-5 px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500">Pages</p>
          <ul className="mt-2 border-y border-neutral-200">
            {site.pages.map((p) => nav(p.slug, p.title || p.slug, reviewed[p.slug] ? <span className="shrink-0 text-kapwa-green-800" title="Checked">✓<span className="sr-only"> checked</span></span> : null))}
          </ul>
        </nav>

        <section className="min-w-0">
          {sel === "@site" && (
            <div className="grid gap-4">
              <h2 className="text-2xl font-display">Site details</h2>
              <Field name="Name" value={site.agency.name} onChange={(v) => edit((s) => { s.agency.name = v; })} />
              <Field name="Short name" value={site.agency.short_name} onChange={(v) => edit((s) => { s.agency.short_name = v; })} />
              <Field name="Tagline (never call the concept official)" value={site.agency.tagline} onChange={(v) => edit((s) => { s.agency.tagline = v; })} />
              <Field name="Description" area value={site.agency.description} onChange={(v) => edit((s) => { s.agency.description = v; })} />
              <Field name="Parent" value={site.agency.parent} onChange={(v) => edit((s) => { s.agency.parent = v; })} />
              <h3 className="mt-4 text-lg font-semibold">Footer</h3>
              <Field name="Address" value={site.footer.address} onChange={(v) => edit((s) => { s.footer.address = v; })} />
              <div className="grid gap-4 sm:grid-cols-3">
                <Field name="Email" value={site.footer.email} onChange={(v) => edit((s) => { s.footer.email = v; })} />
                <Field name="Phone" value={site.footer.phone} onChange={(v) => edit((s) => { s.footer.phone = v; })} />
                <Field name="Hours" value={site.footer.hours} onChange={(v) => edit((s) => { s.footer.hours = v; })} />
              </div>
            </div>
          )}

          {sel === "@entities" && (
            <div>
              <h2 className="text-2xl font-display">People, hotlines and offices</h2>
              <p className="mt-1 max-w-2xl text-sm text-neutral-600">These feed the officials list, the hotlines page and search. Officials and numbers go out of date fastest: check them against the original.</p>
              <ul className="mt-4 divide-y divide-neutral-200 border-y border-neutral-200">
                {site.entities.map((e, i) => (
                  <li key={i} className="grid gap-2 py-3 sm:grid-cols-[10rem_1fr_1fr_auto] sm:items-end">
                    <label className="block"><span className={label}>Type</span>
                      <select value={e.type} onChange={(ev) => edit((s) => { s.entities[i].type = ev.target.value as Entity["type"]; })} className={input}>
                        {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
                      </select>
                    </label>
                    <Field name="Name" value={e.name} onChange={(v) => edit((s) => { s.entities[i].name = v; })} />
                    <Field name={e.type === "hotline" ? "Number" : e.type === "official" ? "Position" : "Detail"} value={e.detail} onChange={(v) => edit((s) => { s.entities[i].detail = v; })} />
                    <button type="button" onClick={() => edit((s) => { s.entities.splice(i, 1); })} className={`${small} h-10`} aria-label={`Remove ${e.name || "this entry"}`}>Remove</button>
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => edit((s) => { s.entities.push({ type: "official", name: "", detail: "", slug: "" }); })} className={`${small} mt-3`}>+ Add an entry</button>
            </div>
          )}

          {page && (
            <div className="grid gap-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[13px] text-neutral-500 break-all">/{page.slug === "home" ? "" : page.slug}</p>
                  <h2 className="text-2xl font-display break-words">{page.title || "Untitled page"}</h2>
                  <p className="mt-1 text-sm"><a href={page.source_url} target="_blank" rel="noreferrer" className="underline">Original page ↗</a>{page.source_screenshot && <> · <a href={`/api/jobs/${site.jobId}/${page.source_screenshot}`} target="_blank" rel="noreferrer" className="underline">Screenshot of the original ↗</a></>}</p>
                </div>
                <label className="flex items-center gap-2 border border-neutral-300 px-3 py-2 text-sm font-semibold">
                  <input type="checkbox" checked={!!reviewed[page.slug]} onChange={(e) => edit((s) => { const r = { ...(s.reviewed ?? {}) }; if (e.target.checked) r[page.slug] = new Date().toISOString(); else delete r[page.slug]; s.reviewed = r; })} className="size-4 accent-kapwa-brand-900" />
                  Checked against the original
                </label>
              </div>
              {page.migration_notes.length > 0 && (
                <div className="border-l-4 border-kapwa-yellow-400 bg-kapwa-yellow-50 px-4 py-3 text-sm">
                  <p className="font-semibold">The agent asks a person to check:</p>
                  <ul className="mt-1 list-disc pl-5">{page.migration_notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
                </div>
              )}
              <Field name="Title" value={page.title} onChange={(v) => editPage((p) => { p.title = v; })} />
              <Field name="Summary" area rows={2} value={page.summary} onChange={(v) => editPage((p) => { p.summary = v; })} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field name="Hero heading" value={page.hero.heading} onChange={(v) => editPage((p) => { p.hero.heading = v; })} />
                <Field name="Hero subheading" value={page.hero.subheading} onChange={(v) => editPage((p) => { p.hero.subheading = v; })} />
              </div>
              <h3 className="mt-4 text-lg font-semibold">Content blocks</h3>
              <ol className="grid gap-5">
                {page.blocks.map((b, bi) => <BlockEditor key={bi} block={b} index={bi} count={page.blocks.length}
                  change={(fn) => editPage((p) => fn(p.blocks[bi]))}
                  move={(d) => editPage((p) => { const [x] = p.blocks.splice(bi, 1); p.blocks.splice(bi + d, 0, x); })}
                  remove={() => editPage((p) => { p.blocks.splice(bi, 1); })} />)}
              </ol>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function BlockEditor({ block, index, count, change, move, remove }: { block: Block; index: number; count: number; change: (fn: (b: Block) => void) => void; move: (d: -1 | 1) => void; remove: () => void }) {
  const set = (k: keyof Item, i: number) => (v: string) => change((b) => { b.items[i][k] = v; });
  return (
    <li className="border border-neutral-300 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-kapwa-brand-900">{String(index + 1).padStart(2, "0")} · {block.type}</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => move(-1)} disabled={index === 0} className={small} aria-label="Move block up">↑</button>
          <button type="button" onClick={() => move(1)} disabled={index === count - 1} className={small} aria-label="Move block down">↓</button>
          <button type="button" onClick={remove} className={small}>Remove block</button>
        </div>
      </div>
      <div className="mt-3 grid gap-3">
        <Field name="Heading" value={block.heading} onChange={(v) => change((b) => { b.heading = v; })} />
        {(block.body_markdown || !block.items.length) && <Field name={block.type === "table" ? "Table (Markdown)" : "Text (Markdown)"} area mono rows={Math.min(14, Math.max(3, block.body_markdown.split("\n").length + 1))} value={block.body_markdown} onChange={(v) => change((b) => { b.body_markdown = v; })} />}
        {block.items.length > 0 && (
          <ul className="grid gap-3">
            {block.items.map((it, i) => (
              <li key={i} className="grid gap-2 border-l-2 border-neutral-300 pl-3 sm:grid-cols-2">
                <Field name="Title" value={it.title} onChange={set("title", i)} />
                <Field name={block.type === "people" ? "Position" : "Meta (date, number…)"} value={it.meta} onChange={set("meta", i)} />
                <Field name="Description" value={it.description} onChange={set("description", i)} />
                <div className="flex items-end gap-2">
                  <div className="flex-1"><Field name="Link" value={it.href} onChange={set("href", i)} /></div>
                  <button type="button" onClick={() => change((b) => { b.items.splice(i, 1); })} className={`${small} h-10`} aria-label={`Remove ${it.title || "item"}`}>Remove</button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <button type="button" onClick={() => change((b) => { b.items.push({ title: "", description: "", href: "", meta: "" }); })} className={`${small} justify-self-start`}>+ Add an item</button>
      </div>
    </li>
  );
}
