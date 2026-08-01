import type { CategoryAction, CategoryRating, EvalLessonPlan, TeacherProfile } from '../types';

export const WOODS_TECH_PROFILE: Partial<TeacherProfile> = {
  subject: 'Woods Technology (WT1, WT2–4)',
  gradeLevel: '9–12',
};

export const WOODS_TECH_GOALS: Record<string, { goal: string; strategy: string }> = {
  focus_for_learning: {
    goal:
      'Move from Skilled to Accomplished by using at least two sources of student data (skill checklists, project rubrics, safety quizzes, and formative measurements) to set measurable growth goals for both WT1 and WT2–4, and help students track their own progress on core carpentry skills.',
    strategy:
      'WT1: Use a pre-unit tool/safety diagnostic and weekly skill checklists (measuring, squaring, cutting, fastening) to set a class SLO such as “80% of students will score proficient on the framing layout assessment by quarter end.” WT2–4: Pair project rubric scores with portfolio reviews to track growth on advanced skills (joinery, rafter layout, finish work). Post learning targets at the start of each shop period, give students a simple progress tracker, and bring data trends to your pre-conference.',
  },
  knowledge_of_students: {
    goal:
      'Reach Accomplished by consistently planning instruction that reflects students’ prior experience, interests, career goals, and learning needs across both intro and advanced woods classes.',
    strategy:
      'Administer a beginning-of-year interest/career inventory. WT1: Group students by prior experience and adjust pacing. WT2–4: Offer project pathways aligned to student goals (residential framing, furniture, custom builds). Consult with intervention staff or ESL support for individual learners before major projects, and document at least one planned adjustment per unit based on a specific student’s background or need.',
  },
  lesson_delivery: {
    goal:
      'Reach Accomplished by clearly communicating differentiated learning goals, modeling exemplary work, using trade-specific questioning, and balancing teacher demonstration with student-centered practice in the shop.',
    strategy:
      'Post “I can…” targets in student-friendly language. Use demo → guided practice → independent practice for both classes. WT1: Break skills into small steps with visual exemplars before tool use. WT2–4: Use higher-order questioning and peer teaching during complex builds. Build in peer feedback and self-assessment using project rubrics, and plan re-teaching moves for common misconceptions (measuring from the wrong edge, rafter layout errors).',
  },
  classroom_environment: {
    goal:
      'Reach Accomplished by maintaining shop routines that maximize safe, productive work time and building a respectful culture where students take ownership of the learning environment.',
    strategy:
      'Co-create shop procedures with students (tool checkout, cleanup zones, PPE, emergency stops). WT1: Practice routines until automatic before tool-heavy units; assign student safety and cleanup roles. WT2–4: Shift responsibility to student leaders (tool crib captain, quality checker, safety monitor). Survey students on shop climate once per semester and act on feedback.',
  },
  assessment_of_learning: {
    goal:
      'Reach Accomplished by using a diagnostic → formative → summative assessment cycle in both course levels, analyzing patterns to adjust instruction, and sharing evidence with students and families.',
    strategy:
      'WT1: Diagnostic (tool ID, measurement, safety) → formative layout checklists → summative framing/rafter rubric. WT2–4: Project milestones as formative checkpoints. Track two data sources and document growth over the semester. Offer assessment choice where appropriate (written plan, oral defense, or physical demonstration). Share progress with families through Canvas, not only at project completion.',
  },
  professional_responsibilities: {
    goal:
      'Reach Accomplished by strengthening partnerships with families, collaborating with colleagues on student success, and pursuing professional growth tied directly to improved student outcomes in the shop.',
    strategy:
      'Send monthly positive outreach to families. Collaborate with academic teachers on math application in layout and rafter calculations. Connect with local trades or SkillsUSA for WT2–4 authentic experiences. Set a Professional Growth Plan goal tied to HQSD-driven skill tracking in WT1, share a successful strategy at a department meeting, and document quarterly reflections with evidence of impact.',
  },
};

type StarterAction = Omit<CategoryAction, 'id' | 'createdAt'>;

export const WOODS_TECH_ACTIONS: StarterAction[] = [
  {
    categoryId: 'focus_for_learning',
    date: '2026-08-15',
    title: 'Administered WT1 skills diagnostic',
    description:
      'Gave pre-unit assessment on measurement, tool ID, and safety before framing unit. Recorded baseline scores to set quarter SLO on layout accuracy.',
  },
  {
    categoryId: 'focus_for_learning',
    date: '2026-09-03',
    title: 'Created student skill progress trackers',
    description:
      'WT1 students received a framing skills checklist (measure, square, mark, cut, assemble). Students update after each practice session.',
  },
  {
    categoryId: 'focus_for_learning',
    date: '2026-10-01',
    title: 'Set measurable SLO for rafter unit',
    description:
      'Used diagnostic layout quiz and practice joint scores to set goal: 80% proficient on common rafter layout by end of unit.',
  },
  {
    categoryId: 'knowledge_of_students',
    date: '2026-08-12',
    title: 'Career interest inventory',
    description:
      'WT1 and WT2–4 completed survey on trades interest, prior shop experience, and post-grad goals. Results inform project options.',
  },
  {
    categoryId: 'knowledge_of_students',
    date: '2026-09-08',
    title: 'Differentiated WT1 grouping',
    description:
      'Grouped students by prior experience for first framing practice; advanced group moved to independent layout sooner.',
  },
  {
    categoryId: 'lesson_delivery',
    date: '2026-09-18',
    title: 'Posted and referenced learning targets',
    description:
      'Posted “I can lay out a common rafter” target; referred back during demo and student practice three times during period.',
  },
  {
    categoryId: 'lesson_delivery',
    date: '2026-10-02',
    title: 'Modeled exemplar rafter layout',
    description:
      'Demonstrated full layout on board with intentional errors for students to identify before live shop demo.',
  },
  {
    categoryId: 'lesson_delivery',
    date: '2026-11-12',
    title: 'Peer feedback on project joints',
    description:
      'WT2–4 students used rubric to give one strength and one improvement suggestion on partner’s dovetail sample.',
  },
  {
    categoryId: 'classroom_environment',
    date: '2026-08-20',
    title: 'Co-created shop procedures',
    description:
      'Students helped write and sign agreements for tool checkout, PPE, cleanup zones, and emergency stops.',
  },
  {
    categoryId: 'classroom_environment',
    date: '2026-10-10',
    title: 'Assigned student leadership roles',
    description:
      'Named safety monitor, tool crib captain, and quality checker for observation week; students ran routines.',
  },
  {
    categoryId: 'assessment_of_learning',
    date: '2026-09-10',
    title: 'WT1 framing diagnostic',
    description:
      'Pre-assessment on wall layout terms, 16" on-center spacing, and safety before first build.',
  },
  {
    categoryId: 'assessment_of_learning',
    date: '2026-10-20',
    title: 'Summative rafter project rubric',
    description:
      'Scored common rafter project on layout accuracy, cut quality, safety, and assembly; compared to Sep diagnostic.',
  },
  {
    categoryId: 'professional_responsibilities',
    date: '2026-09-01',
    title: 'Positive family outreach',
    description:
      'Emailed all WT1 families introducing the framing unit and sharing safety expectations.',
  },
  {
    categoryId: 'professional_responsibilities',
    date: '2026-11-01',
    title: 'Local trades connection',
    description:
      'Invited carpenter/alumni to speak to WT2–4 about career pathways and workplace expectations.',
  },
];

type StarterLessonPlan = Omit<EvalLessonPlan, 'id' | 'createdAt'>;

export const WOODS_TECH_LESSON_PLANS: StarterLessonPlan[] = [
  {
    topic: 'Layout and Cut a Common Rafter to Specification',
    title: 'WT1 — Common Rafter Layout & Cut (Observation Lesson)',
    subject: 'Woods Technology 1',
    gradeLevel: '9–10',
    duration: '90 minutes',
    categoryId: 'lesson_delivery',
    objective:
      'Students will accurately lay out and cut a common rafter using pitch, run, and rafter length calculations, meeting ±1/8" tolerance on all critical measurements.',
    standards:
      'Ohio Career Field Technical Content Standards — Construction Technologies (measurement, layout, safe tool operation). Align to district-specific standard codes.',
    hook:
      'Quick review connecting wall framing to roof systems. Show photo of finished roof frame. Think-pair-share: “What could go wrong if a rafter is cut too short or laid out wrong?”',
    instruction: [
      'Post learning targets: identify pitch/run/rise, lay out with framing square, safely crosscut to spec.',
      'Model on board: pitch 4/12 example — run, rise, rafter length.',
      'Live demo at bench with narrated steps; include intentional measuring error for students to catch.',
      'Higher-order question: “Why do we subtract half the ridge thickness from the rafter length?”',
      'Guided layout practice at tables — no cutting until layout passes formative check.',
      'Independent practice: peer verifies two measurements before student moves to saw.',
    ],
    differentiation: [
      'Approaching: pre-marked layout template or step card with photos; calculator permitted.',
      'On level: standard layout from drawing specs.',
      'Advanced: layout a 6/12 rafter or peer-check partner layout.',
      'Choice: students who pass layout check choose birdsmouth-first vs. plumb-cut-first within safety rules.',
    ],
    assessment: [
      'Diagnostic: pre-unit measurement and layout quiz (already administered).',
      'Formative: layout approval stamp during lesson; thumbs check mid-period.',
      'Summative: rafter rubric scored on layout accuracy, cut quality, safety, assembly.',
      'Closure: self-assessment on rubric and exit notecard reflection.',
    ],
    closure:
      'Students complete self-assessment on rubric. Exit question: “What was hardest about today’s layout, and what will you check first next time?” Preview rafter installation next class.',
    otesEvidence: [
      'Posted, differentiated learning targets referenced during lesson',
      'Exemplar modeling and trade-specific vocabulary',
      'Higher-order questioning and student-to-student measurement checks',
      'Formative data used to approve/re-teach before cutting',
      'Established shop routines with student safety monitor role',
      'Specific, actionable feedback during circulation',
    ],
  },
  {
    topic: 'Joinery Milestone — Self, Peer, and Teacher Assessment',
    title: 'WT2–4 — Joinery Quality Check (Observation Lesson)',
    subject: 'Woods Technology 2/3/4',
    gradeLevel: '10–12',
    duration: '90 minutes',
    categoryId: 'lesson_delivery',
    objective:
      'Students will evaluate their joinery against project specifications, revise one deficient joint, and defend their quality decisions using rubric criteria.',
    standards:
      'Ohio Career Field Technical Content Standards — Construction Technologies (advanced fabrication, quality control, safe tool operation).',
    hook:
      '“Today is a quality gate — no assembly until joinery passes. In the trades, fixing a joint now saves hours later.” Show photo of failed vs. corrected joint.',
    instruction: [
      'Review rubric criteria using student exemplars (proficient vs. approaching).',
      'Model specific feedback language (“Your shoulder is square” vs. “Looks good”).',
      'Explain workflow: self-assess → peer review → teacher sign-off → revise or proceed.',
      'Students set a personal goal for the work session based on rubric self-score.',
      'Structured peer feedback: one strength + one improvement with clarifying question.',
      'Teacher conferences with individual students using their work as evidence.',
    ],
    differentiation: [
      'Some students revise joints; others advance to dry-fit assembly.',
      'Flexible pairing by complementary skills (layout + cutting).',
      'Individual conference notes for students needing math or precision support.',
    ],
    assessment: [
      'Baseline: project milestone rubric from prior week.',
      'Formative: self-assessment + peer feedback form during lesson.',
      'Summative: final project rubric compared to milestone scores.',
      'Closure reflection collected as evidence of revision based on feedback.',
    ],
    closure:
      'Students reflect: “What did you revise based on feedback? How do you know it meets spec?” Collect rubric self-scores and revision plans. Preview next milestone.',
    otesEvidence: [
      'Students set personal goals tied to rubric criteria',
      'Student choice in work path and demonstration of learning',
      'Substantive peer and teacher feedback',
      'Self-assessment before teacher feedback',
      'Differentiated pacing and resources for varied skill levels',
      'Real-world craftsmanship standards driving instruction',
    ],
  },
];

export const WOODS_TECH_EVALUATOR_HANDOUTS = {
  wt1Rafter: {
    title: 'WT1 — Common Rafter Layout & Cut',
    preConference: [
      'Builds on wall-framing unit; measurable SLO: 80% proficient on rafter layout by unit end.',
      'HQSD: pre-unit diagnostic, daily layout checklists, summative rafter rubric.',
      'OTES focus: Focus for Learning, Lesson Delivery, Assessment, Classroom Environment.',
      'Differentiation: step cards, alternate pitch, peer coaching; no cuts until layout passes check.',
    ],
    evidenceChecklist: [
      'Learning targets posted and stated',
      'Connection to prior wall-framing learning',
      'Trade-specific vocabulary during demo',
      'Higher-order questioning; intentional error demo',
      'Formative layout approval before cutting',
      'Peer verification of measurements',
      'Shop routines and PPE; student safety role',
      'Self-assessment and exit reflection at closure',
    ],
  },
  wt24Joinery: {
    title: 'WT2–4 — Joinery Milestone Quality Check',
    preConference: [
      'Quality gate before assembly — mirrors trades workflow.',
      'HQSD: milestone rubric baseline, self/peer assessment today, final project rubric.',
      'OTES focus: Lesson Delivery, Student-Centered Learning, Assessment, Knowledge of Students.',
      'Differentiation: revision vs. dry-fit paths; flexible pairing; individual conferences.',
    ],
    evidenceChecklist: [
      'Real-world quality standards framed at opening',
      'Rubric review with student exemplars',
      'Personal learning goals set by students',
      'Student choice in work path during session',
      'Structured peer feedback protocol',
      'Individual teacher conferences with work as evidence',
      'Reflection on revisions and spec alignment',
    ],
  },
};

export function buildWoodsTechCategoryRatings(
  baseRatings: CategoryRating[],
  options?: { onlyIfEmpty?: boolean },
): CategoryRating[] {
  const now = new Date().toISOString();
  return baseRatings.map(rating => {
    const pack = WOODS_TECH_GOALS[rating.categoryId];
    if (!pack) return rating;
    const goal = options?.onlyIfEmpty && rating.goal?.trim() ? rating.goal : pack.goal;
    const strategy = options?.onlyIfEmpty && rating.strategy?.trim() ? rating.strategy : pack.strategy;
    return {
      ...rating,
      goal,
      strategy,
      updatedAt: now,
    };
  });
}
