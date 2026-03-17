export const metadata = {
  title: "Job Board",
  description: "Student Job Placement Resources"
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}