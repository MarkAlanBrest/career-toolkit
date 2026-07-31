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
  icon: string;
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
    icon: '📊',
  },
  {
    id: 'resume-builder',
    title: 'Resume builder',
    description: 'Help students build polished trade-school resumes with guided sections and PDF export.',
    href: `${RESUME_BUILDER_BASE}/resume-builder-v3.html`,
    category: 'Student tools',
    icon: '📄',
    external: true,
  },
  {
    id: 'cover-letter',
    title: 'Cover letter builder',
    description: 'Create cover letters matched to job applications and student programs.',
    href: `${RESUME_BUILDER_BASE}/cover-letter.html`,
    category: 'Student tools',
    icon: '✉️',
    external: true,
  },
  {
    id: 'resume-admin',
    title: 'Resume builder admin',
    description: 'Manage resume templates, school branding, and builder settings.',
    href: `${RESUME_BUILDER_BASE}/admin`,
    category: 'Student tools',
    icon: '⚙️',
    external: true,
  },
  {
    id: 'resume-search',
    title: 'Resume search',
    description:
      'Search local resume folders, filter by distance, run AI deep scans, and build employer outreach emails.',
    href: '/resume-search.html',
    category: 'Employer tools',
    icon: '🔍',
  },
  {
    id: 'employer-portal',
    title: 'Employer portal',
    description:
      'Employers register, request applicants, post jobs, report hires, and register for PAC and career fairs.',
    href: '/employer-portal',
    category: 'Employer tools',
    icon: '🏢',
  },
  {
    id: 'canvas-broadcast',
    title: 'Canvas broadcast',
    description: 'Send career services emails and announcements to Canvas courses.',
    href: '/canvas-broadcast',
    category: 'Communications',
    icon: '📢',
  },
  {
    id: 'lga-room',
    title: 'LG Room reservations',
    description: 'View availability and request the LG meeting room for employer visits and events.',
    href: '/lga-room/calendar',
    category: 'Events & rooms',
    icon: '🚪',
  },
];

export const HOME_TOOL_ICON = '🏠';

export const DASHBOARD_LG_ROOM_PATH = '/dashboard?tool=lga-room';

export function dashboardToolPath(toolId: string) {
  return `/dashboard?tool=${toolId}`;
}

export function isCareerToolId(id: string) {
  return CAREER_SERVICES_TOOLS.some(tool => tool.id === id);
}

export const CAREER_TOOL_CATEGORIES: CareerToolCategory[] = [
  'Student tools',
  'Employer tools',
  'Communications',
  'Events & rooms',
  'Reporting',
];
