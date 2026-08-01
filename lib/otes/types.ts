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

export type ComponentRating = {
  componentId: string;
  currentLevel: PerformanceLevel | null;
  targetLevel: PerformanceLevel;
  notes: string;
  updatedAt: string;
};

export type EvidenceEntry = {
  id: string;
  componentId: string;
  title: string;
  description: string;
  date: string;
  source: string;
  createdAt: string;
};

export type GrowthGoal = {
  id: string;
  componentId: string;
  title: string;
  description: string;
  actions: string[];
  deadline: string;
  status: 'not_started' | 'in_progress' | 'completed';
  createdAt: string;
};

export type Observation = {
  id: string;
  date: string;
  type: 'formal' | 'walkthrough' | 'pre_conference' | 'post_conference';
  focusDomains: string[];
  notes: string;
  evaluatorFeedback: string;
  lessonPlanId: string | null;
  createdAt: string;
};

export type LessonPlan = {
  id: string;
  title: string;
  subject: string;
  gradeLevel: string;
  duration: string;
  targetDomains: string[];
  targetComponents: string[];
  objective: string;
  standards: string;
  materials: string[];
  hook: string;
  instruction: string[];
  differentiation: string[];
  assessment: string[];
  closure: string;
  otesEvidence: string[];
  reflection: string;
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
  version: 1;
  profile: TeacherProfile;
  ratings: ComponentRating[];
  evidence: EvidenceEntry[];
  goals: GrowthGoal[];
  observations: Observation[];
  lessonPlans: LessonPlan[];
  dismissedSuggestions: string[];
  updatedAt: string;
};

export type Suggestion = {
  id: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  componentId?: string;
  domainId?: string;
  actionSteps: string[];
};

export type ProgressSummary = {
  overallPercent: number;
  accomplishedCount: number;
  skilledCount: number;
  developingCount: number;
  ineffectiveCount: number;
  unratedCount: number;
  totalComponents: number;
  domainProgress: Array<{
    domainId: string;
    domainName: string;
    percent: number;
    gapCount: number;
  }>;
};
