/**
 * WCAG 2.2 support: the A/AA success criteria, an axe-core audit for any Playwright page, and a
 * mapper from Muse Spark's plain-language accessibility findings to the criteria they break.
 */
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import type { Page } from "playwright";

export type Level = "A" | "AA";
/** WCAG 2.2 Level A and AA success criteria (4.1.1 Parsing was removed in 2.2). */
export const WCAG22: Record<string, { name: string; level: Level }> = {
  "1.1.1": { name: "Non-text Content", level: "A" },
  "1.2.1": { name: "Audio-only and Video-only (Prerecorded)", level: "A" },
  "1.2.2": { name: "Captions (Prerecorded)", level: "A" },
  "1.2.3": { name: "Audio Description or Media Alternative (Prerecorded)", level: "A" },
  "1.2.4": { name: "Captions (Live)", level: "AA" },
  "1.2.5": { name: "Audio Description (Prerecorded)", level: "AA" },
  "1.3.1": { name: "Info and Relationships", level: "A" },
  "1.3.2": { name: "Meaningful Sequence", level: "A" },
  "1.3.3": { name: "Sensory Characteristics", level: "A" },
  "1.3.4": { name: "Orientation", level: "AA" },
  "1.3.5": { name: "Identify Input Purpose", level: "AA" },
  "1.4.1": { name: "Use of Color", level: "A" },
  "1.4.2": { name: "Audio Control", level: "A" },
  "1.4.3": { name: "Contrast (Minimum)", level: "AA" },
  "1.4.4": { name: "Resize Text", level: "AA" },
  "1.4.5": { name: "Images of Text", level: "AA" },
  "1.4.10": { name: "Reflow", level: "AA" },
  "1.4.11": { name: "Non-text Contrast", level: "AA" },
  "1.4.12": { name: "Text Spacing", level: "AA" },
  "1.4.13": { name: "Content on Hover or Focus", level: "AA" },
  "2.1.1": { name: "Keyboard", level: "A" },
  "2.1.2": { name: "No Keyboard Trap", level: "A" },
  "2.1.4": { name: "Character Key Shortcuts", level: "A" },
  "2.2.1": { name: "Timing Adjustable", level: "A" },
  "2.2.2": { name: "Pause, Stop, Hide", level: "A" },
  "2.3.1": { name: "Three Flashes or Below Threshold", level: "A" },
  "2.4.1": { name: "Bypass Blocks", level: "A" },
  "2.4.2": { name: "Page Titled", level: "A" },
  "2.4.3": { name: "Focus Order", level: "A" },
  "2.4.4": { name: "Link Purpose (In Context)", level: "A" },
  "2.4.5": { name: "Multiple Ways", level: "AA" },
  "2.4.6": { name: "Headings and Labels", level: "AA" },
  "2.4.7": { name: "Focus Visible", level: "AA" },
  "2.4.11": { name: "Focus Not Obscured (Minimum)", level: "AA" },
  "2.5.1": { name: "Pointer Gestures", level: "A" },
  "2.5.2": { name: "Pointer Cancellation", level: "A" },
  "2.5.3": { name: "Label in Name", level: "A" },
  "2.5.4": { name: "Motion Actuation", level: "A" },
  "2.5.7": { name: "Dragging Movements", level: "AA" },
  "2.5.8": { name: "Target Size (Minimum)", level: "AA" },
  "3.1.1": { name: "Language of Page", level: "A" },
  "3.1.2": { name: "Language of Parts", level: "AA" },
  "3.2.1": { name: "On Focus", level: "A" },
  "3.2.2": { name: "On Input", level: "A" },
  "3.2.3": { name: "Consistent Navigation", level: "AA" },
  "3.2.4": { name: "Consistent Identification", level: "AA" },
  "3.2.6": { name: "Consistent Help", level: "A" },
  "3.3.1": { name: "Error Identification", level: "A" },
  "3.3.2": { name: "Labels or Instructions", level: "A" },
  "3.3.3": { name: "Error Suggestion", level: "AA" },
  "3.3.4": { name: "Error Prevention (Legal, Financial, Data)", level: "AA" },
  "3.3.7": { name: "Redundant Entry", level: "A" },
  "3.3.8": { name: "Accessible Authentication (Minimum)", level: "AA" },
  "4.1.2": { name: "Name, Role, Value", level: "A" },
  "4.1.3": { name: "Status Messages", level: "AA" },
};
export const scSort = (a: string, b: string) => { const x = a.split(".").map(Number), y = b.split(".").map(Number); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; };

// Ordered rules from finding wording to criteria. A finding can break more than one.
const RULES: [RegExp, string[]][] = [
  [/contrast|legib|faint|hard to read against|light (grey|gray) text|pale text/i, ["1.4.3"]],
  [/images? of text|text (embedded )?(in|as) (an? )?(image|graphic|banner|poster)|image-only|scanned|infographic|poster|flyer/i, ["1.4.5", "1.1.1"]],
  [/\balt\b|alt text|alternative text|alt attribute|decorative image|missing (image )?description|unlabel+ed (image|icon|graphic)/i, ["1.1.1"]],
  [/carousel|slider|slideshow|auto-?play|auto-?rotat|marquee|scrolling text|ticker|animated|blink/i, ["2.2.2"]],
  [/\bvideo|\baudio|caption|transcript/i, ["1.2.2"]],
  [/heading|\bh[1-6]\b|hierarch|outline/i, ["1.3.1", "2.4.6"]],
  [/click here|read more|learn more|more\.\.\.|link text|vague link|generic link|ambiguous link|non-descriptive link|bare url/i, ["2.4.4"]],
  [/empty link|empty button|button (with no|without) (text|name|label)|icon-only (link|button)|unlabel+ed (link|button|control)/i, ["4.1.2", "2.4.4"]],
  [/target size|tap target|touch target|small (click|tap|touch)|tiny (button|link|icon)/i, ["2.5.8"]],
  [/\blabel|placeholder|form field|\binput\b|search box|search field/i, ["3.3.2", "4.1.2"]],
  [/focus (indicator|outline|style|ring)|focus is not visible|no visible focus/i, ["2.4.7"]],
  [/keyboard|tab order|focus order/i, ["2.1.1", "2.4.3"]],
  [/hover|drop-?down|mega.?menu|fly-?out/i, ["1.4.13", "2.1.1"]],
  [/skip (link|to)|bypass|landmark|<main>|main region/i, ["2.4.1"]],
  [/\blang\b|language attribute|language of|mixed (filipino|tagalog|english)|filipino and english|in tagalog|in filipino/i, ["3.1.1", "3.1.2"]],
  [/layout table|tables? (used )?for layout|data table|table header|<th>|table without/i, ["1.3.1"]],
  [/colou?r (alone|only)|only by colou?r|indicated by colou?r|relies on colou?r/i, ["1.4.1"]],
  [/small (font|text|type)|font size|tiny text|text size|zoom|resiz|fixed (font|text) size|px font/i, ["1.4.4"]],
  [/line (spacing|height)|letter spacing|justified|all.?caps|cramped|dense text|wall of text/i, ["1.4.12"]],
  [/not responsive|non-responsive|horizontal scroll|reflow|fixed.?width|mobile/i, ["1.4.10"]],
  [/page title|<title>|title tag|untitled page/i, ["2.4.2"]],
  [/inconsistent (nav|menu)|navigation (differs|changes)/i, ["3.2.3"]],
  [/new (window|tab)|opens? (in )?a new/i, ["3.2.2"]],
  [/captcha|log ?in|password/i, ["3.3.8"]],
  [/error message|validation/i, ["3.3.1"]],
];

/** WCAG 2.2 criteria a written finding refers to: explicit numbers win, then wording rules. Empty = best practice. */
export function wcagForFinding(text: string): string[] {
  const explicit = [...text.matchAll(/\b([1-4])\.(\d{1,2})\.(\d{1,2})\b/g)].map((m) => `${m[1]}.${m[2]}.${m[3]}`).filter((sc) => WCAG22[sc]);
  if (explicit.length) return [...new Set(explicit)];
  const out: string[] = [];
  for (const [re, scs] of RULES) if (re.test(text)) for (const sc of scs) if (!out.includes(sc)) out.push(sc);
  return out.slice(0, 3);
}

/** axe tag "wcag1410" → "1.4.10". */
export function scFromAxeTag(tag: string): string | null {
  const m = /^wcag(\d)(\d)(\d{1,2})$/.exec(tag);
  return m && WCAG22[`${m[1]}.${m[2]}.${m[3]}`] ? `${m[1]}.${m[2]}.${m[3]}` : null;
}

export type AxeViolation = { id: string; impact: string; help: string; sc: string[]; nodes: number };
export type AxeResult = { violations: AxeViolation[]; passes: number; incomplete: number; sc_passed: string[] };

let axeSource = "";
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"];

/** Run axe-core (WCAG 2.0-2.2 A/AA rules) on the page as it is now. */
export async function axeAudit(page: Page): Promise<AxeResult> {
  if (!axeSource) axeSource = readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
  await page.addScriptTag({ content: axeSource });
  type Raw = { violations: { id: string; impact: string | null; help: string; tags: string[]; nodes: unknown[] }[]; passes: { tags: string[] }[]; incomplete: unknown[] };
  const raw = await page.evaluate(async (tags) => {
    const axe = (window as unknown as { axe: { run: (ctx: Document, o: object) => Promise<unknown> } }).axe;
    return axe.run(document, { runOnly: { type: "tag", values: tags }, resultTypes: ["violations", "passes", "incomplete"] });
  }, AXE_TAGS) as Raw;
  const scs = (tags: string[]) => [...new Set(tags.map(scFromAxeTag).filter((s): s is string => !!s))];
  const failed = new Set(raw.violations.flatMap((v) => scs(v.tags)));
  return {
    violations: raw.violations.map((v) => ({ id: v.id, impact: v.impact ?? "minor", help: v.help, sc: scs(v.tags), nodes: v.nodes.length })),
    passes: raw.passes.length,
    incomplete: raw.incomplete.length,
    sc_passed: [...new Set(raw.passes.flatMap((p) => scs(p.tags)))].filter((s) => !failed.has(s)),
  };
}
