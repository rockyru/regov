import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: { default: "RE:GOV", template: "%s · RE:GOV" },
  description: "Reimagine Government. An autonomous AI agent that transforms legacy government websites into modern, accessible, citizen-first digital experiences.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="editorial min-h-full flex flex-col font-sans"><noscript><style>{`[data-reveal],[data-reveal][data-stagger]>*{opacity:1!important;transform:none!important}`}</style></noscript>{children}</body>
    </html>
  );
}
