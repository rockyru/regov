import type { SitePage } from "@/pipeline/schema";
import { previewHref } from "@/lib/jobs";
import { Markdown } from "./Markdown";

type Block = SitePage["blocks"][number];
type Item = Block["items"][number];

const initials = (n: string) => n.split(/\s+/).filter((w) => /^[A-Z]/.test(w)).slice(0, 2).map((w) => w[0]).join("");

function A({ href, jobId, origin, className, children }: { href: string; jobId: string; origin: string; className?: string; children: React.ReactNode }) {
  if (!href) return <span className={className}>{children}</span>;
  const h = previewHref(jobId, origin, href);
  const ext = /^https?:/.test(h);
  return <a href={h} className={className} {...(ext ? { target: "_blank", rel: "noreferrer" } : {})}>{children}</a>;
}

export function Block({ block, jobId, origin }: { block: Block; jobId: string; origin: string }) {
  const H = ({ children }: { children: React.ReactNode }) => children ? <h2 className="text-2xl sm:text-[28px] font-bold tracking-tight leading-tight text-neutral-900 mb-4 pt-4 border-t-2 border-neutral-900">{children}</h2> : null;
  const md = <Markdown text={block.body_markdown} jobId={jobId} origin={origin} />;
  const items: Item[] = (block.items ?? []).filter((it) => !/^(Protected|Private):/i.test(it.title));

  switch (block.type) {
    case "cards":
      return (
        <section><H>{block.heading}</H>{md}
          <div className="mt-4 grid border-t border-l border-neutral-200 *:border-r *:border-b *:border-neutral-200 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((it, i) => (
              <A key={i} href={it.href} jobId={jobId} origin={origin} className="group bg-white p-5 hover:bg-kapwa-brand-50">
                {it.meta && <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-kapwa-brand-700 mb-2">{it.meta}</div>}
                <div className="font-semibold text-neutral-900 group-hover:text-kapwa-brand-900">{it.title}</div>
                {it.description && <p className="mt-1.5 text-sm text-neutral-600 line-clamp-3">{it.description}</p>}
              </A>
            ))}
          </div>
        </section>
      );
    case "people":
      return (
        <section><H>{block.heading}</H>{md}
          <ul className="mt-4 grid border-t border-l border-neutral-200 *:border-r *:border-b *:border-neutral-200 sm:grid-cols-2">
            {items.map((p, i) => (
              <li key={i} className="flex gap-4 bg-white p-4">
                <span className="size-14 shrink-0 bg-kapwa-brand-950 text-white grid place-items-center font-bold">{initials(p.title) || "•"}</span>
                <div className="min-w-0">
                  <A href={p.href} jobId={jobId} origin={origin} className="font-semibold text-neutral-900 hover:text-kapwa-brand-900">{p.title}</A>
                  {p.meta && <div className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.18em] text-kapwa-brand-800">{p.meta}</div>}
                  {p.description && <p className="mt-1 text-sm text-neutral-600">{p.description}</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      );
    case "links":
      return (
        <section><H>{block.heading}</H>{md}
          <ul className="mt-3 divide-y divide-neutral-200 border-y border-neutral-900 bg-white">
            {items.map((it, i) => {
              const isFile = /\.(pdf|docx?|xlsx?|pptx?|zip)/i.test(it.href);
              return (
                <li key={i}>
                  <A href={it.href} jobId={jobId} origin={origin} className="flex items-start gap-3 px-1 py-3 hover:bg-kapwa-brand-50">
                    <span className={`mt-0.5 inline-flex size-7 shrink-0 items-center justify-center text-[11px] font-bold ${isFile ? "bg-kapwa-red-50 text-kapwa-red-700" : "bg-kapwa-brand-50 text-kapwa-brand-800"}`}>{isFile ? it.href.split(".").pop()?.toUpperCase().slice(0, 4) : "→"}</span>
                    <span className="min-w-0">
                      <span className="block font-medium text-neutral-900">{it.title}</span>
                      {(it.description || it.meta) && <span className="block text-sm text-neutral-600">{[it.description, it.meta].filter(Boolean).join(" · ")}</span>}
                    </span>
                  </A>
                </li>
              );
            })}
          </ul>
        </section>
      );
    case "list":
      return (
        <section><H>{block.heading}</H>{md}
          <ul className="mt-3 space-y-2">
            {items.map((it, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-[0.7em] h-px w-4 shrink-0 bg-neutral-900" />
                <span><A href={it.href} jobId={jobId} origin={origin} className={it.href ? "font-medium text-kapwa-brand-800 hover:underline" : "font-medium text-neutral-900"}>{it.title}</A>{it.meta && <span className="text-neutral-500"> · {it.meta}</span>}{it.description && <span className="text-neutral-700"> — {it.description}</span>}</span>
              </li>
            ))}
          </ul>
        </section>
      );
    case "steps":
      return (
        <section><H>{block.heading}</H>{md}
          <ol className="mt-4 divide-y divide-neutral-200 border-y border-neutral-200">
            {items.map((it, i) => (
              <li key={i} className="flex gap-4 py-4">
                <span className="size-9 shrink-0 bg-kapwa-brand-950 text-white grid place-items-center font-mono text-sm font-bold">{String(i + 1).padStart(2, "0")}</span>
                <div><div className="font-semibold text-neutral-900">{it.title}</div>{it.description && <p className="text-neutral-700 text-[15px]">{it.description}</p>}{it.meta && <div className="text-sm text-neutral-500 mt-0.5">{it.meta}</div>}</div>
              </li>
            ))}
          </ol>
        </section>
      );
    case "faq":
      return (
        <section><H>{block.heading}</H>{md}
          <div className="mt-3 divide-y divide-neutral-200 border-y border-neutral-900">
            {items.map((it, i) => (
              <details key={i} className="group px-1 py-3">
                <summary className="cursor-pointer list-none font-medium text-neutral-900 flex justify-between gap-4">{it.title}<span className="text-neutral-400 group-open:rotate-45 transition">+</span></summary>
                <p className="mt-2 text-[15px] text-neutral-700">{it.description}</p>
              </details>
            ))}
          </div>
        </section>
      );
    case "timeline":
      return (
        <section><H>{block.heading}</H>{md}
          <ol className="mt-4 relative border-l border-neutral-900 ml-1.5 space-y-6">
            {items.map((it, i) => (
              <li key={i} className="pl-6 relative">
                <span className="absolute -left-[5px] top-2 size-[9px] bg-neutral-900" />
                <div className="font-mono text-xs font-bold text-kapwa-brand-800">{it.meta || it.title}</div>
                <div className="font-medium text-neutral-900">{it.meta ? it.title : ""}</div>
                {it.description && <p className="text-[15px] text-neutral-700">{it.description}</p>}
              </li>
            ))}
          </ol>
        </section>
      );
    case "contact": {
      const LABEL = /^(address|office address|email|e-mail|phone|telephone|tel|fax|mobile|hotline|trunkline|hours|office hours|website|web|contact|contact number|location|facebook|twitter|viber)\b/i;
      const rows = items.map((it) => {
        const fields = [it.title, it.description, it.meta].map((f) => (f ?? "").trim()).filter(Boolean);
        const uniq = [...new Set(fields)];
        const label = uniq.find((f) => LABEL.test(f) && f.length <= 28) ?? uniq.find((f) => f.length <= 20 && !/[\d@]/.test(f)) ?? "";
        const values = uniq.filter((f) => f !== label);
        const value = values.sort((a, b) => b.length - a.length)[0] ?? "";
        const extra = values.filter((v) => v !== value && !value.includes(v));
        return { label, value, extra };
      }).filter((r) => r.value);
      const Val = ({ v }: { v: string }) => {
        if (/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(v)) return <a className="text-kapwa-brand-800 hover:underline break-all" href={`mailto:${v}`}>{v}</a>;
        if (/^(\+?\d[\d\s().-]{6,})$/.test(v)) return <a className="text-kapwa-brand-800 hover:underline" href={`tel:${v.replace(/[^+\d]/g, "")}`}>{v}</a>;
        if (/^(https?:\/\/|www\.)/i.test(v)) return <a className="text-kapwa-brand-800 hover:underline break-all" href={v.startsWith("http") ? v : `https://${v}`} target="_blank" rel="noreferrer">{v.replace(/^https?:\/\//, "")}</a>;
        return <>{v}</>;
      };
      return (
        <section className="bg-kapwa-brand-50 border-t-2 border-neutral-900 p-6">
          {block.heading && <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-500 mb-3">{block.heading}</h2>}
          {md}
          {rows.length > 0 && (
            <dl className="mt-3 space-y-4">
              {rows.map((r, i) => (
                <div key={i}>
                  {r.label && <dt className="text-[11px] font-semibold uppercase tracking-wider text-kapwa-brand-800">{r.label}</dt>}
                  <dd className="text-[15px] leading-snug text-neutral-800"><Val v={r.value} />{r.extra.map((e, j) => <span key={j} className="block text-sm text-neutral-600"><Val v={e} /></span>)}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      );
    }
    case "callout":
      return (
        <section className="border-l-4 border-kapwa-yellow-400 bg-kapwa-yellow-50 p-5">{block.heading && <h2 className="font-semibold text-neutral-900 mb-1">{block.heading}</h2>}{md}
          {items.length > 0 && <ul className="mt-2 list-disc pl-5 text-[15px]">{items.map((it, i) => <li key={i}><span className="font-medium">{it.title}</span>{it.description && ` — ${it.description}`}</li>)}</ul>}
        </section>
      );
    case "image":
      return (
        <figure className="border border-dashed border-neutral-400 bg-neutral-50 p-5 text-sm text-neutral-600">
          {block.heading && <figcaption className="font-semibold text-neutral-800 mb-1">{block.heading}</figcaption>}
          <div className="prose-gov text-[15px]"><Markdown text={block.body_markdown} jobId={jobId} origin={origin} /></div>
          <div className="mt-2 text-xs uppercase tracking-wider text-neutral-400">Image on the original site · transcribed</div>
        </figure>
      );
    case "table":
    case "richtext":
    default:
      return (
        <section><H>{block.heading}</H>{md}
          {items.length > 0 && <ul className="mt-3 list-disc pl-6 space-y-1 text-[16px]">{items.map((it, i) => <li key={i}><A href={it.href} jobId={jobId} origin={origin} className={it.href ? "text-kapwa-brand-800 hover:underline" : ""}>{it.title}</A>{it.description && <span className="text-neutral-700"> — {it.description}</span>}</li>)}</ul>}
        </section>
      );
  }
}
