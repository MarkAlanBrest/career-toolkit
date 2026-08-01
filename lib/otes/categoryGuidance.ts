import { OTES_RUBRIC } from './rubric';

export type CategoryGuidance = {
  accomplishedSummary: string;
  dailyHabits: string[];
  strategies: string[];
};

export const CATEGORY_GUIDANCE: Record<string, CategoryGuidance> = {
  focus_for_learning: {
    accomplishedSummary:
      'You use multiple HQSD sources to set measurable goals, connect lessons to prior and future learning, align to Ohio standards, and help students track their own progress.',
    dailyHabits: [
      'Post a clear learning target at the start of each lesson.',
      'Reference one data point when planning (exit ticket, quiz, observation note).',
      'Make one explicit connection to prior learning or what comes next.',
      'Name the Ohio standard you are teaching today.',
    ],
    strategies: [
      'Set a measurable student growth goal using at least two HQSD sources.',
      'Create a student-facing progress tracker for your current unit.',
      'Bring HQSD trends to your pre-conference with your evaluator.',
    ],
  },
  knowledge_of_students: {
    accomplishedSummary:
      'Your planning consistently reflects individual student experiences, culture, strengths, and needs — informed by colleagues and outside resources.',
    dailyHabits: [
      'Use at least one student name with a specific strategy during instruction.',
      'Check in with a struggling or quiet student before the lesson ends.',
      'Reference something you know about a student\'s interest or background.',
      'Note one student need to address in tomorrow\'s plan.',
    ],
    strategies: [
      'Complete student interest or learning-style inventories and use them in planning.',
      'Consult with intervention, ESL, or support staff about specific learners.',
      'Document how you adjusted instruction for an individual student.',
    ],
  },
  lesson_delivery: {
    accomplishedSummary:
      'You communicate differentiated goals, engage students in higher-level thinking, give timely individual feedback, and balance teacher-directed and student-directed learning.',
    dailyHabits: [
      'State the learning goal and what mastery looks like.',
      'Ask one higher-order question and wait for student thinking.',
      'Give one specific, actionable feedback comment to a student.',
      'Use a quick formative check (thumbs, whiteboard, exit slip).',
    ],
    strategies: [
      'Build accountable talk stems into your observation lesson.',
      'Add peer feedback or self-assessment to a major assignment.',
      'Plan anticipated misconceptions and re-teaching moves in advance.',
    ],
  },
  classroom_environment: {
    accomplishedSummary:
      'You and your students maintain routines that maximize learning time, and you create a climate of respect, openness, and cultural responsiveness.',
    dailyHabits: [
      'Greet students at the door by name.',
      'Use a consistent transition signal and praise on-task behavior.',
      'Address one student perspective with genuine regard.',
      'End class with a calm, predictable routine.',
    ],
    strategies: [
      'Co-create classroom procedures with students and practice them.',
      'Assign student leadership roles for transitions during observations.',
      'Survey students on classroom climate and act on one piece of feedback.',
    ],
  },
  assessment_of_learning: {
    accomplishedSummary:
      'You strategically use diagnostic, formative, and summative assessments; analyze trends to differentiate; and share evidence with students, families, and colleagues.',
    dailyHabits: [
      'Use one formative check to adjust instruction before the period ends.',
      'Share one piece of assessment feedback with a student.',
      'Record one data point in your tracker after class.',
      'Offer one way for students to show learning differently.',
    ],
    strategies: [
      'Run a diagnostic → formative → summative cycle in your observation unit.',
      'Bring assessment data to a PLC and co-plan adjustments.',
      'Document student growth using at least two HQSD sources.',
    ],
  },
  professional_responsibilities: {
    accomplishedSummary:
      'You communicate effectively with families and colleagues, follow professional standards, pursue ambitious growth goals, and contribute beyond your classroom.',
    dailyHabits: [
      'Send one positive or informative message to a family.',
      'Collaborate with one colleague on instruction or student needs.',
      'Follow district policies and document one professional decision.',
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
    return { accomplishedSummary: '', dailyHabits: [], strategies: [] };
  }
  const strategies = domain.components.flatMap(c => c.accomplishedActions).slice(0, 5);
  const accomplishedSummary = domain.components
    .map(c => c.levels.accomplished)
    .join(' ');
  return { accomplishedSummary, dailyHabits: [], strategies };
}
