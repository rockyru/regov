"use client";

export function PrintButton({ className = "" }: { className?: string }) {
  return <button type="button" onClick={() => window.print()} className={className}>Print / save PDF</button>;
}
