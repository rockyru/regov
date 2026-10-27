import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Element, ElementContent, Root } from "hast";
import { previewHref } from "@/lib/jobs";

const textOf = (n: ElementContent): string => (n.type === "text" ? n.value : n.type === "element" ? n.children.map(textOf).join("") : "");

/** Marks headed tables `data-stack` and labels each cell with its column, so CSS can show rows as cards on phones.
 *  Explicit ARIA roles keep the table semantics that `display: block` would otherwise drop in some screen readers. */
function rehypeStackTables() {
  const role = (el: Element, r: string) => { el.properties = { ...el.properties, role: r }; };
  const label = (table: Element) => {
    const rows: Element[] = [];
    const collect = (n: Element) => { for (const c of n.children) if (c.type === "element") { if (c.tagName === "tr") rows.push(c); else { if (c.tagName === "thead" || c.tagName === "tbody") role(c, "rowgroup"); collect(c); } } };
    collect(table);
    const head = rows.find((r) => r.children.some((c) => c.type === "element" && c.tagName === "th"));
    const labels = head ? head.children.filter((c): c is Element => c.type === "element").map((c) => textOf(c).trim()) : [];
    if (!labels.some(Boolean)) return;
    table.properties = { ...table.properties, dataStack: "", role: "table" };
    for (const r of rows) {
      role(r, "row");
      let i = 0;
      for (const c of r.children) {
        if (c.type !== "element") continue;
        if (c.tagName === "th") role(c, "columnheader");
        else if (c.tagName === "td") { role(c, "cell"); if (labels[i]) c.properties = { ...c.properties, dataLabel: labels[i] }; }
        i++;
      }
    }
  };
  const BR = /^<br\s*\/?>$/i;
  return (tree: Root) => {
    const walk = (n: Root | Element) => {
      // Muse Spark writes <br> for line breaks inside table cells; raw HTML is otherwise shown as text.
      n.children = n.children.map((c) => (c.type === "raw" && BR.test(c.value.trim()) ? { type: "element", tagName: "br", properties: {}, children: [] } : c)) as typeof n.children;
      for (const c of n.children) if (c.type === "element") { if (c.tagName === "table") label(c); walk(c); }
    };
    walk(tree);
  };
}

/** Visible text for a link that has none (an icon whose image was not migrated): its address, shortened. */
export function hrefText(href: string) {
  return href.replace(/^(mailto|tel):/, "").replace(/^https?:\/\/(www\.)?/, "").replace(/[/?#]+$/, "");
}
export const isBlank = (children: React.ReactNode): boolean =>
  children == null || children === false || (typeof children === "string" && !children.trim()) || (Array.isArray(children) && children.every(isBlank));

export function Markdown({ text, jobId, origin, className = "" }: { text: string; jobId: string; origin: string; className?: string }) {
  if (!text?.trim()) return null;
  return (
    <div className={`prose-gov ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeStackTables]}
        components={{ a: ({ href, children }) => <a href={previewHref(jobId, origin, href ?? "")}>{isBlank(children) ? hrefText(href ?? "") : children}</a> }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
