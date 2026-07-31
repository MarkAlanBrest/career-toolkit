export type CareerToolCategory =
  | 'Reporting'
  | 'Student tools'
  | 'Employer tools'
  | 'Communications'
  | 'Events & rooms';

export type CareerTool = {
  id: string;
  title: string;
  description: string;
  href: string;
  category: CareerToolCategory;
  external?: boolean;
};

const RESUME_BUILDER_BASE =
  process.env.NEXT_PUBLIC_RESUME_BUILDER_URL || 'https://resume-builder-one-gules-56.vercel.app';

export const CAREER_SERVICES_TOOLS: CareerTool[] = [
  {
    id: 'career-reports',
    title: 'Reporting hub',
    description:
      'Upload spreadsheets and documents, ask questions, and generate reports (PAC, hires, ACCSC gaps).',
    href: '/career-reports',
    category: 'Reporting',
  },
  {
    id: 'resume-builder',
    title: 'Resume builder',
    description: 'Help students build polished trade-school resumes with guided sections and PDF export.',
    href: `${RESUME_BUILDER_BASE}/resume-builder-v3.html`,
    category: 'Student tools',
    external: true,
  },
  {
    id: 'cover-letter',
    title: 'Cover letter builder',
    description: 'Create cover letters matched to job applications and student programs.',
    href: `${RESUME_BUILDER_BASE}/cover-letter.html`,
    category: 'Student tools',
    external: true,
  },
  {
    id: 'resume-admin',
    title: 'Resume builder admin',
    description: 'Manage resume templates, school branding, and builder settings.',
    href: `${RESUME_BUILDER_BASE}/admin`,
    category: 'Student tools',
    external: true,
  },
  {
    id: 'student-portal',
    title: 'Student portal',
    description: 'Student-facing hub for career resources and NCST career services links.',
    href: '/student-portal',
    category: 'Student tools',
  },
  {
    id: 'employer-portal',
    title: 'Employer portal',
    description:
      'Employers register, request applicants, post jobs, report hires, and register for PAC and career fairs.',
    href: '/employer-portal',
    category: 'Employer tools',
  },
  {
    id: 'canvas-broadcast',
    title: 'Canvas broadcast',
    description: 'Send career services emails and announcements to Canvas courses.',
    href: '/canvas-broadcast',
    category: 'Communications',
  },
  {
    id: 'lga-room',
    title: 'LG Room reservations',
    description: 'View availability and request the LG meeting room for employer visits and events.',
    href: '/lga-room',
    category: 'Events & rooms',
  },
];

export const CAREER_TOOL_CATEGORIES: CareerToolCategory[] = [
  'Reporting',
  'Student tools',
  'Employer tools',
  'Communications',
  'Events & rooms',
];
