import type { CanvasAssignment, CanvasEnrollment, CanvasSubmission, CanvasUser } from './canvas';

export type ReportCategory =
  | 'student'
  | 'course'
  | 'engagement'
  | 'communication'
  | 'administrative'
  | 'utilities';

export type ReportId =
  | 'student-snapshot'
  | 'student-conference'
  | 'course-health'
  | 'missing-work'
  | 'communication-timeline'
  | 'student-case-file'
  | 'instructor-notes'
  | 'no-login'
  | 'grade-documentation'
  | 'assignment-analytics';

export type ReportDefinition = {
  id: ReportId;
  category: ReportCategory;
  title: string;
  description: string;
  priority: number;
  supportsCsv: boolean;
  supportsPdf: boolean;
  printable: boolean;
};

export type StudentMetrics = {
  student: CanvasUser;
  enrollment?: CanvasEnrollment;
  currentGrade: string;
  currentScore: number | null;
  missingCount: number;
  lateCount: number;
  submissionRate: number;
  discussionParticipation: number;
  lastLogin?: string | null;
  lastCourseActivity?: string | null;
  submissions: CanvasSubmission[];
};

export type CourseHealthMetrics = {
  courseName: string;
  studentCount: number;
  courseAverage: number | null;
  highestGrade: number | null;
  lowestGrade: number | null;
  missingAssignmentCount: number;
  lateAssignmentCount: number;
  inactiveStudentCount: number;
  gradeDistribution: Array<{ label: string; count: number }>;
};

export type MissingWorkRow = {
  studentName: string;
  studentId: number;
  assignmentName: string;
  assignmentId: number;
  dueDate: string | null;
  daysOverdue: number | null;
};

export type AssignmentAnalyticsRow = {
  assignment: CanvasAssignment;
  average: number | null;
  median: number | null;
  high: number | null;
  low: number | null;
  completionPercent: number;
  missingPercent: number;
};
