import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Providers } from "@/components/providers";
import { isDemo } from "@/lib/env";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Scout", template: "%s · Scout" },
  description: "A personal job-hunt copilot: ranked matches, tracker and evals.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfcfd" },
    { media: "(prefers-color-scheme: dark)", color: "#16171b" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="font-sans antialiased">
        <Providers demo={isDemo()}>{children}</Providers>
      </body>
    </html>
  );
}
