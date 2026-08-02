import { OTES_RUBRIC, buildCategoryAccomplishedGoalText } from './rubric';

export type CategoryGuidance = {
  accomplishedSummary: string;
  strategies: string[];
};

export const CATEGORY_GUIDANCE: Record<string, CategoryGuidance> = {
  focus_for_learning: {
    accomplishedSummary: buildCategoryAccomplishedGoalText('focus_for_learning'),
    strategies: [
      'Set a measurable student growth goal using at least two HQSD sources.',
      'Create a student-facing progress tracker for your current unit.',
      'Review HQSD and progress data weekly; note one trend to address.',
      'Bring HQSD trends to your pre-conference with your evaluator.',
    ],
  },
  knowledge_of_students: {
    accomplishedSummary: buildCategoryAccomplishedGoalText('knowledge_of_students'),
    strategies: [
      'Complete student interest or learning-style inventories and use them in planning.',
      'Review students weekly to see who is struggling and check in.',
      'Consult with intervention, ESL, or support staff about specific learners.',
      'Document how you adjusted instruction for an individual student.',
    ],
  },
  lesson_delivery: {
    accomplishedSummary: buildCategoryAccomplishedGoalText('lesson_delivery'),
    strategies: [
      'Build accountable talk stems into your observation lesson.',
      'Review formative checks from the week and plan one re-teaching move.',
      'Add peer feedback or self-assessment to a major assignment.',
      'Plan anticipated misconceptions and re-teaching moves in advance.',
    ],
  },
  classroom_environment: {
    accomplishedSummary: buildCategoryAccomplishedGoalText('classroom_environment'),
    strategies: [
      'Co-create classroom procedures with students and practice them.',
      'Assign student leadership roles for transitions during observations.',
      'Review the week and follow up with any student who seemed disconnected.',
      'Survey students on classroom climate and act on one piece of feedback.',
    ],
  },
  assessment_of_learning: {
    accomplishedSummary: buildCategoryAccomplishedGoalText('assessment_of_learning'),
    strategies: [
      'Run a diagnostic → formative → summative cycle in your observation unit.',
      'Review assessment data weekly and note one pattern to address.',
      'Bring assessment data to a PLC and co-plan adjustments.',
      'Document student growth using at least two HQSD sources.',
    ],
  },
  professional_responsibilities: {
    accomplishedSummary: buildCategoryAccomplishedGoalText('professional_responsibilities'),
    strategies: [
      'Send one positive or informative message to a family each week.',
      'Collaborate with a colleague on instruction or student needs.',
      'Lead or co-lead a PLC on a specific problem of practice.',
      'Tie your Professional Growth Plan goals directly to rubric evidence.',
    ],
  },
};

export function getCategoryGuidance(categoryId: string): CategoryGuidance {
  if (CATEGORY_GUIDANCE[categoryId]) return CATEGORY_GUIDANCE[categoryId];
  const domain = OTES_RUBRIC.find(d => d.id === categoryId);
  if (!domain) {
    return { accomplishedSummary: '', strategies: [] };
  }
  const strategies = domain.components.flatMap(c => c.accomplishedActions).slice(0, 5);
  const accomplishedSummary = domain.components
    .map(c => c.levels.accomplished)
    .join(' ');
  return { accomplishedSummary, strategies };
}
