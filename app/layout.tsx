export const metadata = {
  title: 'Canvas Enhancer - Free Canvas Tools for Teachers',
  description: 'Free Canvas teaching tools for content, grading workflows, scheduling, and messaging.',
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
