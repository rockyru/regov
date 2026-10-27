import type { CSSProperties } from "react";

/**
 * Brand scale for "refine" sites: the old site's primary colour replaces Kapwa blue. Every
 * kapwa-brand-* utility reads these variables, so setting them on the site root re-themes it.
 */
export function brandScale(primary: string): CSSProperties {
  const mix = (pct: number, to: string) => `color-mix(in oklab, ${primary} ${pct}%, ${to})`;
  return {
    "--color-kapwa-brand-950": mix(62, "black"),
    "--color-kapwa-brand-900": primary,
    "--color-kapwa-brand-800": mix(88, "white"),
    "--color-kapwa-brand-700": mix(76, "white"),
    "--color-kapwa-brand-600": mix(64, "white"),
    "--color-kapwa-brand-500": mix(52, "white"),
    "--color-kapwa-brand-400": mix(40, "white"),
    "--color-kapwa-brand-300": mix(28, "white"),
    "--color-kapwa-brand-200": mix(18, "white"),
    "--color-kapwa-brand-100": mix(10, "white"),
    "--color-kapwa-brand-50": mix(5, "white"),
  } as CSSProperties;
}
