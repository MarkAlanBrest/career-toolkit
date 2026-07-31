import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Career Services Dashboard — NCST',
  description: 'NCST Career Services tools — reporting, employer portal, resume builder, Canvas broadcast, and more.',
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
