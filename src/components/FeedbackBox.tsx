"use client";
import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Floating comment box on every RE:GOV page (src/app/api/feedback). Opens from its button, or from
 * any link to #feedback (the rebuilt sites' top bar links to /report/<job>#feedback).
 */
export function FeedbackBox() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");
  const path = usePathname();
  const id = useId();
  const area = useRef<HTMLTextAreaElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const openedAt = useRef(0);

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
    const res = await fetch("/api/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: f.get("message"), email: f.get("email"), website: f.get("website"), page: path, elapsed: Date.now() - openedAt.current }) }).catch(() => null);
    const out = (await res?.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
    if (res?.ok && out?.ok) setState("sent");
    else { setState("idle"); setError(out?.error ?? "That didn't go through. Please try again."); }
  }

  return (
    <div className="print:hidden fixed right-4 z-50 bottom-[calc(max(1rem,env(safe-area-inset-bottom))+5rem)] lg:bottom-6 lg:right-6 flex flex-col items-end gap-3">
      {open && (
        <div role="dialog" aria-labelledby={`${id}-title`} onKeyDown={(e) => e.key === "Escape" && close()}
          className="w-[min(22rem,calc(100vw-2rem))] border border-kapwa-brand-900 bg-white shadow-[0_16px_40px_-12px_rgba(0,0,0,0.45)]">
          <div className="flex items-center justify-between gap-3 bg-kapwa-brand-900 px-4 py-3 text-white">
            <h2 id={`${id}-title`} className="text-[15px] font-semibold">Send us a comment</h2>
            <button type="button" onClick={close} aria-label="Close" className="-mr-1 cursor-pointer grid size-8 place-items-center hover:bg-white/10">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" aria-hidden className="size-4"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </div>
          {state === "sent" ? (
            <div role="status" className="px-4 py-5 text-[15px] text-neutral-800">
              <p className="font-semibold text-neutral-900">Thank you. It&rsquo;s on its way.</p>
              <p className="mt-1 text-neutral-600">We read every comment. If you left an email address, we may write back.</p>
              <button type="button" onClick={() => setState("idle")} className="mt-4 cursor-pointer text-sm font-semibold text-kapwa-brand-900 border-b-2 border-kapwa-brand-900">Send another</button>
            </div>
          ) : (
            <form onSubmit={send} className="px-4 py-4">
              <label htmlFor={`${id}-msg`} className="block text-sm text-neutral-700">A bug, a site we got wrong, an idea, or a request from an agency.</label>
              <textarea ref={area} id={`${id}-msg`} name="message" required minLength={3} maxLength={4000} rows={5}
                className="mt-2 block w-full resize-y border border-neutral-400 px-3 py-2 text-[15px] focus:border-kapwa-brand-900 focus:outline-2 focus:outline-kapwa-brand-900" />
              <label htmlFor={`${id}-email`} className="mt-3 block text-sm text-neutral-700">Your email <span className="text-neutral-500">(optional, if you&rsquo;d like a reply)</span></label>
              <input id={`${id}-email`} name="email" type="email" autoComplete="email" maxLength={200}
                className="mt-1 block h-10 w-full border border-neutral-400 px-3 text-[15px] focus:border-kapwa-brand-900 focus:outline-2 focus:outline-kapwa-brand-900" />
              {/* Honeypot: hidden from people and screen readers. */}
              <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] h-px w-px" />
              {error && <p role="alert" className="mt-3 text-sm font-semibold text-kapwa-red-700">{error}</p>}
              <div className="mt-4 flex items-center justify-between gap-3">
                <a href="/privacy" className="text-[13px] text-neutral-500 underline">Privacy</a>
                <button type="submit" disabled={state === "sending"} className="inline-flex h-10 cursor-pointer items-center bg-kapwa-brand-900 px-5 text-sm font-semibold text-white hover:bg-kapwa-brand-950 disabled:cursor-wait disabled:opacity-60">{state === "sending" ? "Sending…" : "Send"}</button>
              </div>
            </form>
          )}
        </div>
      )}
      <button ref={toggle} type="button" onClick={() => (open ? close() : setOpen(true))} aria-expanded={open}
        className="inline-flex h-12 cursor-pointer items-center gap-2 border border-black/30 bg-kapwa-brand-900 px-4 text-sm font-semibold text-white shadow-[0_12px_32px_-8px_rgba(0,0,0,0.5)] hover:bg-kapwa-brand-950">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="square" strokeLinejoin="miter" aria-hidden className="size-5"><path d="M4 5h16v11H9l-5 4z" /></svg>
        Feedback
      </button>
    </div>
  );
}
