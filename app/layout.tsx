import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Institutional Market Intelligence Terminal",
  description:
    "AI-powered institutional research terminal for ticker intelligence, competitor analysis, leadership intelligence, risk exposure, thesis building, and market monitoring.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
