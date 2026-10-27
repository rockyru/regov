# Fix list

Spotted on the live site; fix after the queue quiets down.

1. **Preview pages overflow on phones when a title is one long unbreakable string** (seen on a DepEd rebuild: a content page titled with an email address, `…ar.llena@deped.gov.ph`). The h1, the eyebrow and the intro link push the page wider than the viewport, so the header band and rules get clipped. Fix in two places: `overflow-wrap: anywhere` / `break-words` on preview headings, eyebrows and prose links in `src/components/site/Pages.tsx` and `Blocks.tsx`, plus `overflow-x: clip` on the preview `<main>`; and have the planner reject titles that are bare emails or URLs (use the page's parent section or "Contact" instead) in `src/pipeline/plan.ts` / `understand.ts`.
2. **Deploy pending** (commits 0c2d287, f22e64e): boot reconcile, crash detection, 15-minute stall net, 20-minute watchdog, compact run strip. Ship tonight when the queue is low.
