"use client";
import { useSyncExternalStore } from "react";
import type { Happening } from "@/lib/explore/types";

const subscribe = () => () => {};

/** Today in the reader's browser, or null while rendering on the server (so a built page never goes stale). */
export function useToday(): Date | null {
  const day = useSyncExternalStore(subscribe, () => new Date().toDateString(), () => null);
  return day ? new Date(day) : null;
}

/** Whether an event is past or still to come, by month: the LGU's pages give its dates as text. */
export function eventStatus(e: Happening, now: Date): string {
  const y = now.getFullYear(), m = now.getMonth() + 1;
  if (e.year) return e.year < y || (e.year === y && e.month < m) ? `Held in ${e.year}` : e.year === y && e.month === m ? "This month" : `Coming in ${e.year}`;
  return e.month === m ? "This month" : `Every year · next in ${e.month < m ? y + 1 : y}`;
}

export function EventStatus({ event, className }: { event: Happening; className?: string }) {
  const now = useToday();
  return <span className={className}>{now ? eventStatus(event, now) : ""}</span>;
}
