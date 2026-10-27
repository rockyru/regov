import { AppHeader, AppFooter, eyebrow, nn } from "@/components/AppShell";

export type LegalSection = { title: string; body: React.ReactNode };

/** Plain, numbered legal page in the editorial system. */
export function LegalPage({ kicker, title, deck, updated, sections }: { kicker: string; title: string; deck: string; updated: string; sections: LegalSection[] }) {
  return (
    <>
      <AppHeader crumb={title} />
      <main className="flex-1">
        <div className="container-gov pt-10 pb-20 max-w-5xl">
          <p className={`${eyebrow} text-kapwa-brand-900`}>{kicker}</p>
          <h1 className="mt-2 text-4xl sm:text-5xl font-black tracking-tight">{title}</h1>
          <p className="mt-4 max-w-2xl text-lg text-neutral-600">{deck}</p>
          <p className="mt-3 text-sm text-neutral-500">Last updated {updated}. Questions: <a className="underline decoration-neutral-300 underline-offset-4 hover:decoration-kapwa-brand-900" href="https://github.com/rockyru/regov/issues">GitHub issues</a> or <a className="underline decoration-neutral-300 underline-offset-4 hover:decoration-kapwa-brand-900" href="https://rmbergonia.com">rmbergonia.com</a>.</p>
          <ol className="mt-10 border-t-2 border-kapwa-brand-900">
            {sections.map((s, i) => (
              <li key={s.title} className="grid gap-x-10 gap-y-2 md:grid-cols-[minmax(0,16rem)_1fr] border-b border-neutral-200 py-7">
                <h2 className="font-bold text-neutral-900 flex gap-3"><span className="tabular-nums text-kapwa-brand-900">{nn(i)}</span>{s.title}</h2>
                <div className="text-[15px] leading-relaxed text-neutral-700 space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1.5 [&_a]:underline [&_a]:decoration-neutral-300 [&_a]:underline-offset-4 hover:[&_a]:decoration-kapwa-brand-900">{s.body}</div>
              </li>
            ))}
          </ol>
        </div>
      </main>
      <AppFooter />
    </>
  );
}
