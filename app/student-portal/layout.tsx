import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Student Portal — New Castle School of Trades',
  description: 'Student resources for Career Services, Financial Aid, and NCST support.',
};

export default function StudentPortalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
