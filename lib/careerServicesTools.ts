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
    id: 'local-job-search',
    title: 'Local job search',
    description:
      'Search NCST employers, Indeed, LinkedIn, Google Jobs, and ZipRecruiter in one combined results list.',
    href: '/job-search',
    category: 'Student tools',
    icon: '🧭',
  },
  {
    id: 'employer-portal-admin',
    title: 'Employer portal admin',
    description: 'Post upcoming events and announcements on the employer portal overview.',
    href: '/employer-portal/admin/announcements',
    category: 'Employer tools',
    icon: '📣',
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

export type DashboardNavGroup = {
  id: string;
  label: string;
  icon: string;
  toolIds: string[];
};

/** Sidebar menu groups — multi-tool groups render as dropdowns. */
export const DASHBOARD_NAV_GROUPS: DashboardNavGroup[] = [
  {
    id: 'reporting',
    label: 'Reporting',
    icon: '📊',
    toolIds: ['career-reports'],
  },
  {
    id: 'resumes',
    label: 'Resumes',
    icon: '📄',
    toolIds: ['resume-builder', 'cover-letter', 'resume-admin'],
  },
  {
    id: 'jobs',
    label: 'Jobs',
    icon: '🧭',
    toolIds: ['local-job-search', 'resume-search'],
  },
  {
    id: 'employers',
    label: 'Employers',
    icon: '🏢',
    toolIds: ['employer-portal', 'employer-portal-admin'],
  },
  {
    id: 'communications',
    label: 'Canvas',
    icon: '📢',
    toolIds: ['canvas-broadcast'],
  },
  {
    id: 'rooms',
    label: 'LG Room',
    icon: '🚪',
    toolIds: ['lga-room'],
  },
];

export const DASHBOARD_LG_ROOM_PATH = '/dashboard?tool=lga-room';
export const DASHBOARD_LOCAL_JOB_SEARCH_PATH = '/dashboard?tool=local-job-search';

export type DashboardNavGroupWithTools = DashboardNavGroup & { tools: CareerTool[] };

export function dashboardNavGroups(): DashboardNavGroupWithTools[] {
  return DASHBOARD_NAV_GROUPS
    .map(group => ({
      ...group,
      tools: group.toolIds
        .map(id => CAREER_SERVICES_TOOLS.find(tool => tool.id === id))
        .filter((tool): tool is CareerTool => Boolean(tool)),
    }))
    .filter(group => group.tools.length > 0);
}

export function navGroupIdForTool(toolId: string): string | null {
  const group = DASHBOARD_NAV_GROUPS.find(item => item.toolIds.includes(toolId));
  return group?.id ?? null;
}

export function dashboardToolPath(toolId: string) {
  return `/dashboard?tool=${toolId}`;
}

export function isCareerToolId(id: string) {
  return CAREER_SERVICES_TOOLS.some(tool => tool.id === id);
}

export const CAREER_TOOL_CATEGORIES: CareerToolCategory[] = [
  'Reporting',
  'Student tools',
  'Employer tools',
  'Communications',
  'Events & rooms',
];
