import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Career Safety Training",
  description: "Interactive workplace safety courses and completion certificates.",
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
