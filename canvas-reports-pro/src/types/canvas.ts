export type CanvasId = number | string;

export type CanvasCourse = {
  id: number;
  name: string;
  course_code?: string;
  workflow_state?: string;
  term?: { id: number; name: string };
};

export type CanvasUser = {
  id: number;
  name: string;
  sortable_name?: string;
  short_name?: string;
  email?: string;
  login_id?: string;
  last_login?: string | null;
};

export type CanvasEnrollment = {
  id: number;
  course_id: number;
  user_id: number;
  type: string;
  workflow_state: string;
  last_activity_at?: string | null;
  total_activity_time?: number | null;
  grades?: {
    current_score?: number | null;
    current_grade?: string | null;
    final_score?: number | null;
    final_grade?: string | null;
  };
  user?: CanvasUser;
};

export type CanvasAssignment = {
  id: number;
  name: string;
  due_at?: string | null;
  points_possible?: number | null;
  html_url?: string;
  published?: boolean;
  submission_types?: string[];
  needs_grading_count?: number;
};

export type CanvasSubmissionComment = {
  id: number;
  author_id: number;
  author_name: string;
  comment: string;
  created_at: string;
};

export type CanvasSubmission = {
  id?: number;
  assignment_id: number;
  assignment?: CanvasAssignment;
  user_id: number;
  user?: CanvasUser;
  submitted_at?: string | null;
  graded_at?: string | null;
  grade?: string | null;
  score?: number | null;
  workflow_state?: 'submitted' | 'unsubmitted' | 'graded' | 'pending_review' | string;
  late?: boolean;
  missing?: boolean;
  seconds_late?: number | null;
  late_policy_status?: 'late' | 'missing' | 'extended' | 'none' | null;
  submission_comments?: CanvasSubmissionComment[] | null;
  read_status?: string;
};

export type CanvasDiscussionTopic = {
  id: number;
  title: string;
  posted_at?: string | null;
  user_name?: string;
  discussion_subentry_count?: number;
};

export type CanvasPageView = {
  id: string;
  created_at: string;
  url: string;
  context_type?: string;
  asset_type?: string;
  asset_id?: number;
  controller?: string;
  action?: string;
};
