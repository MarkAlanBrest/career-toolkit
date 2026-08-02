import { OTES_RUBRIC, buildCategoryAccomplishedGoalText } from './rubric';

export type CategoryGuidance = {
  accomplishedSummary: string;
  strategies: string[];
};

/** Two high-impact strategies per category — the Skilled → Accomplished gap. */
export const CATEGORY_GUIDANCE: Record<string, CategoryGuidance> = {
  focus_for_learning: {
    accomplishedSummary: buildCategoryAccomplishedGoalText('focus_for_learning'),
    strategies: [
      'Students set goals and track progress on a student-facing tracker.',
      'Use HQSD from two sources to spot trends and adjust instruction.',
    ],
  },
  knowledge_of_students: {
    accomplishedSummary: buildCategoryAccomplishedGoalText('knowledge_of_students'),
    strategies: [
      'Document one planned adjustment for a specific student (with evidence).',
      'Consult school professionals about a learner before a major unit.',
    ],
  },
  lesson_delivery: {
    accomplishedSummary: buildCategoryAccomplishedGoalText('lesson_delivery'),
    strategies: [
      'Build student-to-student interaction into your observation lesson.',
      'Add peer feedback or self-assessment with reflection on a major project.',
    ],
  },
  classroom_environment: {
    accomplishedSummary: buildCategoryAccomplishedGoalText('classroom_environment'),
    strategies: [
      'Co-create shop routines with students; shift responsibility to student leaders.',
      'Survey students on classroom climate and act on one piece of feedback.',
    ],
  },
  assessment_of_learning: {
    accomplishedSummary: buildCategoryAccomplishedGoalText('assessment_of_learning'),
    strategies: [
      'Offer at least one differentiated way for students to demonstrate learning.',
      'Use two HQSD sources to document individual student growth over the unit.',
    ],
  },
  professional_responsibilities: {
    accomplishedSummary: buildCategoryAccomplishedGoalText('professional_responsibilities'),
    strategies: [
      'Initiate collaboration outside your classroom (PLC, dept meeting, peer observation).',
      'Tie your growth plan goal to rubric evidence; reflect on student impact.',
    ],
  },
};

export function getCategoryGuidance(categoryId: string): CategoryGuidance {
  if (CATEGORY_GUIDANCE[categoryId]) return CATEGORY_GUIDANCE[categoryId];
  const domain = OTES_RUBRIC.find(d => d.id === categoryId);
  if (!domain) {
    return { accomplishedSummary: '', strategies: [] };
  }
  const strategies = domain.components.flatMap(c => c.accomplishedActions).slice(0, 2);
  const accomplishedSummary = domain.components
    .map(c => c.levels.accomplished)
    .join(' ');
  return { accomplishedSummary, strategies };
}
