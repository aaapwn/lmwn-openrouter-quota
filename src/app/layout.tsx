import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenRouter Quota",
  description: "Read-only view of one OpenRouter key's spending limit.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      {/* Browser extensions (e.g. Grammarly) add attributes to <body> before hydration. */}
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
