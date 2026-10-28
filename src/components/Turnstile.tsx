"use client";
import Script from "next/script";
import { useEffect, useImperativeHandle, useRef } from "react";

type WidgetId = string;
type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => WidgetId;
  reset: (id: WidgetId) => void;
  remove: (id: WidgetId) => void;
};
declare global {
  interface Window { turnstile?: TurnstileApi }
}

/** Handle for the parent: reset after every submit attempt, since a token works only once. */
export type TurnstileHandle = { reset: () => void };

/**
 * Cloudflare Turnstile widget, rendered explicitly so each form keeps and resets its own widget.
 * Invisible unless Cloudflare needs the visitor to interact. The token goes to onToken, and also
 * into a hidden cf-turnstile-response field for native form posts. Server side: src/lib/turnstile.ts.
 */
export function Turnstile({ sitekey, action, onToken, ref, className = "" }: { sitekey: string; action: string; onToken: (token: string) => void; ref?: React.Ref<TurnstileHandle>; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const id = useRef<WidgetId | null>(null);
  const tokenCb = useRef(onToken);
  useEffect(() => { tokenCb.current = onToken; }, [onToken]);
  useImperativeHandle(ref, () => ({ reset: () => { tokenCb.current(""); if (id.current !== null) window.turnstile?.reset(id.current); } }), []);

  useEffect(() => {
    let stopped = false;
    const mount = () => {
      if (stopped || id.current !== null || !box.current) return;
      if (!window.turnstile) { setTimeout(mount, 150); return; }
      id.current = window.turnstile.render(box.current, {
        sitekey, action, appearance: "interaction-only", size: "flexible",
        callback: (t: string) => tokenCb.current(t),
        "expired-callback": () => tokenCb.current(""),
        "error-callback": () => { tokenCb.current(""); return false; },
      });
    };
    mount();
    return () => {
      stopped = true;
      if (id.current !== null) window.turnstile?.remove(id.current);
      id.current = null;
    };
  }, [sitekey, action]);

  return (
    <>
      <Script id="cf-turnstile" src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" />
      <div ref={box} className={className} />
    </>
  );
}
