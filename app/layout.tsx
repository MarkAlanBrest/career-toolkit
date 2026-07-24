import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mason | AI Safety Training",
  description: "Dynamic, source-grounded workplace training taught by Mason.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-sky-800 min-h-screen">{children}</body>
    </html>
  );
}
