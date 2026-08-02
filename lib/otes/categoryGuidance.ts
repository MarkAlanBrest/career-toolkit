import { OTES_RUBRIC, buildCategoryAccomplishedGoalText } from './rubric';

export type CategoryGuidance = {
  accomplishedSummary: string;
  strategies: string[];
};

/** Four strategies per category — the Skilled → Accomplished gap. */
export const CATEGORY_GUIDANCE: Record<string, CategoryGuidance> = {
  focus_for_learning: {
    accomplishedSummary: buildCategoryAccomplishedGoalText('focus_for_learning'),
    strategies: [
      'Students set goals and track progress on a student-facing tracker.',
      'Use HQSD from two sources to spot trends and adjust instruction.',
      'Set a measurable student growth goal using at least two HQSD sources.',
      'Bring HQSD trends to your pre-conference with your evaluator.',
    ],
  },
  knowledge_of_students: {
    accomplishedSummary: buildCategoryAccomplishedGoalText('knowledge_of_students'),
    strategies: [
      'Document one planned adjustment for a specific student (with evidence).',
      'Consult school professionals about a learner before a major unit.',
      'Use student interest or career inventory results to shape a unit or project.',
      'Review students weekly to see who is struggling and check in.',
    ],
  },
  lesson_delivery: {
    accomplishedSummary: buildCategoryAccomplishedGoalText('lesson_delivery'),
    strategies: [
      'Build student-to-student interaction into your observation lesson.',
      'Add peer feedback or self-assessment with reflection on a major project.',
      'Plan anticipated misconceptions and re-teaching moves before the lesson.',
      'Use questioning that pushes higher-order and creative thinking.',
    ],
  },
  classroom_environment: {
    accomplishedSummary: buildCategoryAccomplishedGoalText('classroom_environment'),
    strategies: [
      'Co-create shop routines with students; shift responsibility to student leaders.',
      'Survey students on classroom climate and act on one piece of feedback.',
      'Assign student safety or leadership roles during observations.',
      'Follow up with a student who seemed disconnected or unheard.',
    ],
  },
  assessment_of_learning: {
    accomplishedSummary: buildCategoryAccomplishedGoalText('assessment_of_learning'),
    strategies: [
      'Offer at least one differentiated way for students to demonstrate learning.',
      'Use two HQSD sources to document individual student growth over the unit.',
      'Run a diagnostic → formative → summative cycle in your observation unit.',
      'Share assessment evidence with colleagues or families collaboratively.',
    ],
  },
  professional_responsibilities: {
    accomplishedSummary: buildCategoryAccomplishedGoalText('professional_responsibilities'),
    strategies: [
      'Initiate collaboration outside your classroom (PLC, dept meeting, peer observation).',
      'Tie your growth plan goal to rubric evidence; reflect on student impact.',
      'Send one positive or informative message to a family each week.',
      'Lead or co-lead a PLC on a specific problem of practice.',
    ],
  },
};

export function getCategoryGuidance(categoryId: string): CategoryGuidance {
  if (CATEGORY_GUIDANCE[categoryId]) return CATEGORY_GUIDANCE[categoryId];
  const domain = OTES_RUBRIC.find(d => d.id === categoryId);
  if (!domain) {
    return { accomplishedSummary: '', strategies: [] };
  }
  const strategies = domain.components.flatMap(c => c.accomplishedActions).slice(0, 4);
  const accomplishedSummary = domain.components
    .map(c => c.levels.accomplished)
    .join(' ');
  return { accomplishedSummary, strategies };
}
