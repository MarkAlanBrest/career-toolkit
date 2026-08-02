import type { Metadata } from "next";
import { bodyFont, headingFont } from "@/lib/brand";
import "./globals.css";

export const metadata: Metadata = {
  title: "Professional Training | New Castle School of Trades",
  description:
    "Custom workforce training from New Castle School of Trades — onboarding, employee development, refreshers, and certificates.",
  icons: {
    icon: "/ncst-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${headingFont.variable} ${bodyFont.variable}`}>
      <body className="antialiased min-h-screen">{children}</body>
    </html>
  );
}
