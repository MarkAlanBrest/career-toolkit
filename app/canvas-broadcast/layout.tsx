import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Canvas Broadcasting',
  description: 'Send Canvas inbox messages and announcements to students across NCST campuses.',
};

export default function CanvasBroadcastLayout({ children }: { children: React.ReactNode }) {
  return children;
}
