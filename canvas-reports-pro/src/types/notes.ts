export type InstructorNote = {
  id: string;
  courseId: string;
  studentId: string;
  studentName: string;
  body: string;
  tags: string[];
  followUpDate?: string;
  createdAt: string;
  updatedAt: string;
};

export type ConferenceRecord = {
  id: string;
  courseId: string;
  studentId: string;
  studentName: string;
  summary: string;
  actionPlan: string;
  followUpDate?: string;
  createdAt: string;
};

export type EarlyAlertRule = {
  id: string;
  courseId: string;
  label: string;
  enabled: boolean;
  field: 'currentScore' | 'missingCount' | 'lateCount' | 'daysSinceLastActivity';
  operator: '<' | '<=' | '>' | '>=';
  threshold: number;
};
