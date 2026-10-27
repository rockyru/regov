"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Re-renders the server page in place every `ms` while mounted. Keeps scroll and state; pauses in a hidden tab. */
export function LiveRefresh({ ms = 2000 }: { ms?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, ms);
    const onShow = () => { if (document.visibilityState === "visible") router.refresh(); };
    document.addEventListener("visibilitychange", onShow);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", onShow); };
  }, [router, ms]);
  return null;
}
