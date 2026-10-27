import type { Metadata } from "next";
import { Inter, Belleza } from "next/font/google";
import "./globals.css";

// Display face: Optima, installed on every Mac and iPhone (used from the system, never hosted).
// Elsewhere the browser falls back to Belleza, a free Optima-style web font.
const belleza = Belleza({ subsets: ["latin"], weight: "400", variable: "--font-belleza", display: "swap" });
const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "RE:GOV", template: "%s · RE:GOV" },
  description: "Reimagine Government. An autonomous AI agent that transforms legacy government websites into modern, accessible, citizen-first digital experiences.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${belleza.variable} h-full antialiased`}>
      <body className="editorial min-h-full flex flex-col font-sans"><noscript><style>{`[data-reveal],[data-reveal][data-stagger]>*{opacity:1!important;transform:none!important}`}</style></noscript>{children}</body>
    </html>
  );
}
