/** Page-transition loader: the RE:GOV mark inside a spinning ring (SVG, so the editorial no-radius rule does not square it). */
export function LogoLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-1 items-center justify-center py-32">
      <div className="relative size-20">
        <svg viewBox="0 0 80 80" aria-hidden className="absolute inset-0 size-full motion-safe:animate-spin [animation-duration:1.1s]">
          <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="3" className="text-neutral-200" />
          <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="60 226" className="text-kapwa-brand-900" />
        </svg>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/mark.svg" alt="" className="absolute left-1/2 top-1/2 h-9 w-auto -translate-x-1/2 -translate-y-1/2 motion-safe:animate-pulse" />
      </div>
      <span className="sr-only">{label}</span>
    </div>
  );
}
