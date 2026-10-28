# Copy and trust rules

## Voice

Plain, direct, citizen-first. Short sentences, concrete nouns, no hype or marketing superlatives. Say what a thing is and what to do next. Errors explain the cause and the next step (see `INITIAL` in `ReimagineBox.tsx`). Write "Muse Spark", "SAM 3.1", "Muse Image" by name where the models are credited.

## Never

- "Official", "the official website of…", or anything implying the agency made or endorsed the page. Link to the real site as "Official site ↗" or "the agency's official website" only when pointing away from RE:GOV.
- Invented facts, numbers, dates, names, quotes, testimonials, cost figures or progress meters.
- Unlabelled AI imagery standing in for real places or people.
- Support or donation asks on `/preview` sites or in exports. They belong only on the app's own pages.
- Naming private individuals who helped the project in public copy without their consent.

## Always

- The unofficial disclaimer on generated pages (badge + footer notice + noindex). Reuse the existing wording in `Footer` and `PreviewBar`, with its Filipino version.
- Attribute data: "From the BetterGov.ph emergency hotlines dataset", "Open-Meteo · Not an official PAGASA advisory", `COMMUNITY_NOTE` for WikiBayan.
- Label machine translation: "Filipino text machine-translated by Muse Spark".
- Honest gaps: "Not yet migrated" with a link to the source, "The agent found no transparency pages…", "No progress report".
- Dates in Philippine time where time matters ("8:00 AM Philippine time"); `en-PH` formatting.

## Labels

- Sentence case for headings and buttons ("Read the migration report", "View site →"). Arrows: → for in-site, ↗ for external.
- Eyebrows are short nouns ("Section", "Quick links", "Unofficial · Concept"). Separate parts with " · ".
- Interface strings on sites go through `t()`; add the Filipino to `FIL` in `src/components/site/i18n.ts`.
