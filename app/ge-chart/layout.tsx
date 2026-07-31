import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'G&E Chart Report Builder — NCST Career Services',
  description: 'Generate ACCSC Graduation and Employment Chart reports from Career Services Excel data.',
};

export default function GeChartLayout({ children }: { children: React.ReactNode }) {
  return children;
}
