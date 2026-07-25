import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Professional Training Platform",
  description: "Interactive, source-grounded workforce training.",
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
