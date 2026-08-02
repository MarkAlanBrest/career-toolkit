import { OTES_RUBRIC, buildCategoryAccomplishedGoalText } from './rubric';

export type CategoryGuidance = {
  accomplishedSummary: string;
  dailyHabits: string[];
  weeklyHabits: string[];
  strategies: string[];
};

export const CATEGORY_GUIDANCE: Record<string, CategoryGuidance> = {
  focus_for_learning: {
    accomplishedSummary: buildCategoryAccomplishedGoalText('focus_for_learning'),
    dailyHabits: [
      'Post a clear learning target at the start of each lesson.',
      'Make one explicit connection to prior learning or what comes next.',
      'Name the Ohio standard you are teaching today.',
    ],
    weeklyHabits: [
      'Reference at least one HQSD data point when planning the week.',
      'Review student progress trackers and note one trend to address.',
    ],
    strategies: [
      'Set a measurable student growth goal using at least two HQSD sources.',
      'Create a student-facing progress tracker for your current unit.',
      'Bring HQSD trends to your pre-conference with your evaluator.',
    ],
  },
  knowledge_of_students: {
    accomplishedSummary: buildCategoryAccomplishedGoalText('knowledge_of_students'),
    dailyHabits: [
      'Use at least one student name with a specific strategy during instruction.',
      'Check in with a struggling or quiet student before the lesson ends.',
      'Reference something you know about a student\'s interest or background.',
    ],
    weeklyHabits: [
      'Note one student need to address in next week\'s plans.',
      'Review interest or background notes and plan one grouping or pathway adjustment.',
    ],
    strategies: [
      'Complete student interest or learning-style inventories and use them in planning.',
      'Consult with intervention, ESL, or support staff about specific learners.',
      'Document how you adjusted instruction for an individual student.',
    ],
  },
  lesson_delivery: {
    accomplishedSummary: buildCategoryAccomplishedGoalText('lesson_delivery'),
    dailyHabits: [
      'State the learning goal and what mastery looks like.',
      'Ask one higher-order question and wait for student thinking.',
      'Give one specific, actionable feedback comment to a student.',
      'Use a quick formative check (thumbs, whiteboard, exit slip).',
    ],
    weeklyHabits: [
      'Review formative checks from the week and plan one re-teaching move.',
      'Identify one anticipated misconception to address next week.',
    ],
    strategies: [
      'Build accountable talk stems into your observation lesson.',
      'Add peer feedback or self-assessment to a major assignment.',
      'Plan anticipated misconceptions and re-teaching moves in advance.',
    ],
  },
  classroom_environment: {
    accomplishedSummary: buildCategoryAccomplishedGoalText('classroom_environment'),
    dailyHabits: [
      'Greet students at the door by name.',
      'Use a consistent transition signal and praise on-task behavior.',
      'Address one student perspective with genuine regard.',
      'End class with a calm, predictable routine.',
    ],
    weeklyHabits: [
      'Spot-check that routines are running smoothly and reteach one if needed.',
      'Notice one climate pattern (positive or concern) to follow up on.',
    ],
    strategies: [
      'Co-create classroom procedures with students and practice them.',
      'Assign student leadership roles for transitions during observations.',
      'Survey students on classroom climate and act on one piece of feedback.',
    ],
  },
  assessment_of_learning: {
    accomplishedSummary: buildCategoryAccomplishedGoalText('assessment_of_learning'),
    dailyHabits: [
      'Use one formative check to adjust instruction before the period ends.',
      'Share one piece of assessment feedback with a student.',
      'Offer one way for students to show learning differently.',
    ],
    weeklyHabits: [
      'Record assessment data in your tracker and look for one pattern.',
      'Compare this week\'s formative results to your unit goal.',
    ],
    strategies: [
      'Run a diagnostic → formative → summative cycle in your observation unit.',
      'Bring assessment data to a PLC and co-plan adjustments.',
      'Document student growth using at least two HQSD sources.',
    ],
  },
  professional_responsibilities: {
    accomplishedSummary: buildCategoryAccomplishedGoalText('professional_responsibilities'),
    dailyHabits: [
      'Follow district policies and document one professional decision.',
    ],
    weeklyHabits: [
      'Send one positive or informative message to a family.',
      'Collaborate with one colleague on instruction or student needs.',
      'Spend 10 minutes on your growth plan goal.',
    ],
    strategies: [
      'Lead or co-lead a PLC on a specific problem of practice.',
      'Mentor a colleague or host a peer observation exchange.',
      'Tie your Professional Growth Plan goals directly to rubric evidence.',
    ],
  },
};

export function getCategoryGuidance(categoryId: string): CategoryGuidance {
  if (CATEGORY_GUIDANCE[categoryId]) return CATEGORY_GUIDANCE[categoryId];
  const domain = OTES_RUBRIC.find(d => d.id === categoryId);
  if (!domain) {
    return { accomplishedSummary: '', dailyHabits: [], weeklyHabits: [], strategies: [] };
  }
  const strategies = domain.components.flatMap(c => c.accomplishedActions).slice(0, 5);
  const accomplishedSummary = domain.components
    .map(c => c.levels.accomplished)
    .join(' ');
  return { accomplishedSummary, dailyHabits: [], weeklyHabits: [], strategies };
}
