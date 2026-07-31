import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Career Services Reports — NCST',
  description: 'Upload spreadsheets and documents, ask questions, and generate ACCSC-aligned Career Services reports.',
};

export default function CareerReportsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
