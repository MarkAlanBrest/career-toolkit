export const metadata = {
  title: "Canvas Enhancer — Professional Components for Canvas LMS",
  description:
    "Add beautifully styled callouts, headers, tables, layouts, and templates to your Canvas pages with one click. No coding required.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "Lato, 'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}