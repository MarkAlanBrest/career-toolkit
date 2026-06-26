export const metadata = {
  title: 'Canvas Enhancer - Free Canvas Tools with Optional AI Credits',
  description: 'Free Canvas teaching tools for content, grading workflows, scheduling, messaging, and optional prepaid AI credits.',
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
