export type PerformanceLevel = 'ineffective' | 'developing' | 'skilled' | 'accomplished';

export type OrganizationalArea =
  | 'instructional_planning'
  | 'instruction_and_assessment'
  | 'professionalism';

export type RubricComponent = {
  id: string;
  name: string;
  elements: string[];
  evidenceSources: string[];
  levels: Record<PerformanceLevel, string>;
  accomplishedActions: string[];
};

export type RubricDomain = {
  id: string;
  name: string;
  area: OrganizationalArea;
  standards: string[];
  components: RubricComponent[];
};

export type CategoryRating = {
  categoryId: string;
  currentLevel: PerformanceLevel | null;
  goal: string;
  strategy: string;
  updatedAt: string;
};

export type CategoryAction = {
  id: string;
  categoryId: string;
  date: string;
  title: string;
  description: string;
  createdAt: string;
};

export type CategoryCoachMessage = {
  id: string;
  categoryId: string;
  role: 'user' | 'coach';
  content: string;
  createdAt: string;
};

export type EvalLessonPlan = {
  id: string;
  topic: string;
  title: string;
  subject: string;
  gradeLevel: string;
  duration: string;
  categoryId: string;
  objective: string;
  standards: string;
  hook: string;
  instruction: string[];
  differentiation: string[];
  assessment: string[];
  closure: string;
  otesEvidence: string[];
  createdAt: string;
};

export type TeacherProfile = {
  name: string;
  school: string;
  district: string;
  subject: string;
  gradeLevel: string;
  evaluationYear: string;
};

export type OtesWorkspace = {
  version: 2;
  profile: TeacherProfile;
  categoryRatings: CategoryRating[];
  actions: CategoryAction[];
  coachMessages: CategoryCoachMessage[];
  evalLessonPlans: EvalLessonPlan[];
  updatedAt: string;
};

export type CategoryProgress = {
  categoryId: string;
  categoryName: string;
  currentLevel: PerformanceLevel | null;
  levelPercent: number;
  actionCount: number;
  recentActionCount: number;
  goalSet: boolean;
  coachMessageCount: number;
};

export type CategorySuggestion = {
  type: 'daily' | 'strategy' | 'coach';
  text: string;
};
