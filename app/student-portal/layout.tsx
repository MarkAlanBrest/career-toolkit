import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Student Portal — New Castle School of Trades',
  description: 'Student resources for Career Services, Financial Aid, and NCST support.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function StudentPortalLayout({ children }: { children: React.ReactNode }) {
  return children;
}
