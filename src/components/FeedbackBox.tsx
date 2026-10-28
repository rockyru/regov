"use client";
import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { FEEDBACK_TOPICS, MAX_MESSAGE, type FeedbackTopic } from "@/lib/feedbackTopics";
import { Turnstile, type TurnstileHandle } from "./Turnstile";

const PROMPTS: Record<FeedbackTopic, string> = {
  bug: "What happened, and on which page?",
  content: "Which site, and what did the rebuild get wrong?",
  idea: "What would make RE:GOV more useful?",
  agency: "Which agency, and what would you like changed or removed?",
};

const field = "block w-full border border-neutral-300 bg-white px-3 text-[15px] text-neutral-900 placeholder:text-neutral-500 transition-colors hover:border-neutral-500 focus:border-kapwa-brand-900 focus:outline-2 focus:outline-offset-0 focus:outline-kapwa-brand-900";
const icon = { fill: "none", stroke: "currentColor", strokeLinecap: "square", strokeLinejoin: "miter", "aria-hidden": true } as const;

/**
 * Floating comment box on every RE:GOV page (src/app/api/feedback). Opens from its button, or from
 * any link to #feedback (the rebuilt sites' top bar links to /report/<job>#feedback).
 * With a Turnstile sitekey, the form waits for Cloudflare's token and sends it along.
 */
export function FeedbackBox({ sitekey = "" }: { sitekey?: string }) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  const [topic, setTopic] = useState<FeedbackTopic>("idea");
  const [length, setLength] = useState(0);
  const path = usePathname();
  const id = useId();
  const area = useRef<HTMLTextAreaElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const openedAt = useRef(0);
  const [human, setHuman] = useState("");
  const widget = useRef<TurnstileHandle | null>(null);

  useEffect(() => {
    const fromHash = () => { if (location.hash === "#feedback") setOpen(true); };
    fromHash();
    addEventListener("hashchange", fromHash);
    return () => removeEventListener("hashchange", fromHash);
  }, []);
  useEffect(() => {
    if (!open || state === "sent") return;
    openedAt.current = Date.now();
    area.current?.focus();
  }, [open, state]);

  const close = () => {
    setOpen(false);
    if (location.hash === "#feedback") history.replaceState(null, "", location.pathname + location.search);
    toggle.current?.focus();
  };

  async function send(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setState("sending");
    setError("");
    const res = await fetch("/api/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ topic, message: f.get("message"), email: f.get("email"), website: f.get("website"), page: path, elapsed: Date.now() - openedAt.current, turnstile: human }) }).catch(() => null);
    const out = (await res?.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    widget.current?.reset(); // a token works once
    if (res?.ok && out?.ok) { setState("sent"); setLength(0); }
    else { setState("idle"); setError(out?.error ?? "That didn't go through. Please try again."); }
  }

  return (
    <div className="print:hidden fixed right-4 z-50 bottom-[calc(max(1rem,env(safe-area-inset-bottom))+5rem)] lg:bottom-6 lg:right-6 flex flex-col items-end gap-3">
      {open && (
        <div role="dialog" aria-labelledby={`${id}-title`} onKeyDown={(e) => e.key === "Escape" && close()}
          className="w-[min(24rem,calc(100vw-2rem))] max-h-[calc(100dvh-9rem)] overflow-y-auto border border-neutral-900/10 bg-white shadow-[0_24px_60px_-20px_rgba(15,23,42,0.45),0_2px_8px_rgba(15,23,42,0.08)] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-3 motion-safe:duration-200">
          <div className="relative overflow-hidden border-t-4 border-kapwa-yellow-400 bg-kapwa-brand-900 px-5 pb-5 pt-4 text-white">
            {/* RE:GOV mark as a quiet watermark */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/mark-white.svg" alt="" aria-hidden className="pointer-events-none absolute -right-6 -bottom-8 h-32 w-auto opacity-[0.08]" />
            <div className="flex items-start justify-between gap-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-kapwa-yellow-300">Feedback</p>
              <button type="button" onClick={close} aria-label="Close" className="-mr-2 -mt-1 grid size-8 cursor-pointer place-items-center text-white/90 transition-colors hover:bg-white/10 hover:text-white">
                <svg viewBox="0 0 24 24" strokeWidth="2" className="size-4" {...icon}><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </div>
            <h2 id={`${id}-title`} className="mt-1 font-display text-[28px] leading-[1.05] tracking-tight">{state === "sent" ? "Salamat. Thank you." : "Tell us what you think."}</h2>
            {state !== "sent" && <p className="mt-2 text-sm text-white/90">Every comment is read by a person.</p>}
          </div>

          {state === "sent" ? (
            <div role="status" className="px-5 py-6">
              <div className="flex items-start gap-3">
                <span className="grid size-9 shrink-0 place-items-center bg-kapwa-green-50 text-kapwa-green-800">
                  <svg viewBox="0 0 24 24" strokeWidth="2.25" className="size-5" {...icon}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
                </span>
                <p className="text-[15px] leading-snug text-neutral-700"><span className="block font-semibold text-neutral-900">Your comment is on its way.</span>If you left an email address, you may hear back from hello@regov.app.</p>
              </div>
              <button type="button" onClick={() => setState("idle")} className="mt-5 cursor-pointer border-b-2 border-kapwa-brand-900 text-sm font-semibold text-kapwa-brand-900 hover:text-kapwa-brand-950">Send another</button>
            </div>
          ) : (
            <form onSubmit={send} className="px-5 pb-5 pt-4">
              <fieldset>
                <legend className="text-[13px] font-semibold text-neutral-700">It&rsquo;s about</legend>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {FEEDBACK_TOPICS.map((t) => (
                    <label key={t.id} className={`cursor-pointer select-none border px-2.5 py-1.5 text-[13px] font-semibold transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-kapwa-brand-900 ${topic === t.id ? "border-kapwa-brand-900 bg-kapwa-brand-900 text-white" : "border-neutral-300 text-neutral-700 hover:border-kapwa-brand-900 hover:text-kapwa-brand-900"}`}>
                      <input type="radio" name="topic" value={t.id} checked={topic === t.id} onChange={() => setTopic(t.id)} className="sr-only" />{t.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="mt-4 flex items-baseline justify-between gap-3">
                <label htmlFor={`${id}-msg`} className="text-[13px] font-semibold text-neutral-700">Your comment</label>
                <span aria-hidden className={`text-[12px] tabular-nums ${length > MAX_MESSAGE * 0.9 ? "text-kapwa-red-700" : "text-neutral-500"}`}>{length.toLocaleString("en-PH")} / {MAX_MESSAGE.toLocaleString("en-PH")}</span>
              </div>
              <textarea ref={area} id={`${id}-msg`} name="message" required minLength={3} maxLength={MAX_MESSAGE} rows={4} placeholder={PROMPTS[topic]}
                onChange={(e) => setLength(e.target.value.length)} className={`${field} mt-1.5 min-h-28 resize-y py-2.5 leading-snug`} />

              <label htmlFor={`${id}-email`} className="mt-4 block text-[13px] font-semibold text-neutral-700">Email <span className="font-normal text-neutral-500">optional, for a reply</span></label>
              <input id={`${id}-email`} name="email" type="email" autoComplete="email" maxLength={200} placeholder="you@example.com" className={`${field} mt-1.5 h-10`} />
              {/* Honeypot: hidden from people and screen readers. */}
              <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-px w-px" />

              {sitekey && <Turnstile sitekey={sitekey} action="feedback" onToken={setHuman} ref={widget} className="mt-4 empty:hidden" />}

              {error && <p role="alert" className="mt-3 border-l-4 border-kapwa-red-700 bg-kapwa-red-50 px-3 py-2 text-sm font-semibold text-kapwa-red-700">{error}</p>}

              <div className="mt-5 flex items-center justify-between gap-3">
                <p className="text-[12px] leading-snug text-neutral-500">No account needed. <a href="/privacy" className="underline hover:text-neutral-900">Privacy</a></p>
                <button type="submit" disabled={state === "sending" || (!!sitekey && !human)} title={sitekey && !human ? "Checking your browser…" : undefined} className="group inline-flex h-11 cursor-pointer items-center gap-2 bg-kapwa-brand-900 px-5 text-sm font-semibold text-white transition-colors hover:bg-kapwa-brand-950 disabled:cursor-wait disabled:opacity-70">
                  {state === "sending" ? "Sending…" : sitekey && !human ? "Checking…" : "Send"}
                  <svg viewBox="0 0 24 24" strokeWidth="2" className="size-4 transition-transform motion-safe:group-hover:translate-x-0.5" {...icon}><path d="M4 12h15M13 6l6 6-6 6" /></svg>
                </button>
              </div>
            </form>
          )}
        </div>
      )}
      <button ref={toggle} type="button" onClick={() => (open ? close() : setOpen(true))} aria-expanded={open}
        className="group inline-flex h-12 cursor-pointer items-center gap-2.5 border border-black/20 bg-kapwa-brand-900 pl-3.5 pr-4 text-sm font-semibold text-white shadow-[0_14px_32px_-10px_rgba(15,23,42,0.6)] transition-colors hover:bg-kapwa-brand-950">
        <span className="grid size-7 place-items-center bg-kapwa-yellow-400 text-kapwa-brand-950">
          {open
            ? <svg viewBox="0 0 24 24" strokeWidth="2.25" className="size-4" {...icon}><path d="M6 6l12 12M18 6 6 18" /></svg>
            : <svg viewBox="0 0 24 24" strokeWidth="2" className="size-4" {...icon}><path d="M4 5h16v11H9l-5 4z" /><path d="M8 9.5h8M8 12.5h5" /></svg>}
        </span>
        {open ? "Close" : "Feedback"}
      </button>
    </div>
  );
}
