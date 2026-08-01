import type { RubricDomain } from './types';

export const PERFORMANCE_LEVELS = [
  { id: 'ineffective' as const, label: 'Ineffective', score: 0, color: '#c0392b' },
  { id: 'developing' as const, label: 'Developing', score: 1, color: '#e67e22' },
  { id: 'skilled' as const, label: 'Skilled', score: 2, color: '#2980b9' },
  { id: 'accomplished' as const, label: 'Accomplished', score: 3, color: '#1e8449' },
] as const;

export const ORGANIZATIONAL_AREAS = {
  instructional_planning: 'Instructional Planning',
  instruction_and_assessment: 'Instruction & Assessment',
  professionalism: 'Professionalism',
} as const;

export const OTES_RUBRIC: RubricDomain[] = [
  {
    id: 'focus_for_learning',
    name: 'Focus for Learning',
    area: 'instructional_planning',
    standards: ['Students', 'Content', 'Assessment', 'Instruction'],
    components: [
      {
        id: 'hqsd_goals',
        name: 'Use of High-Quality Student Data',
        elements: ['1.1', '1.2', '1.3', '3.3'],
        evidenceSources: ['pre-conference', 'artifacts', 'portfolios', 'analysis of student data'],
        levels: {
          ineffective: 'Does not use high-quality student data to develop measurable, developmentally appropriate student growth goals.',
          developing: 'Uses one source of HQSD and attempts to analyze patterns; analysis may be incomplete or inaccurate.',
          skilled: 'Thoroughly analyzes patterns in at least two sources of HQSD to develop measurable goals and monitors progress.',
          accomplished: 'Analyzes trends and patterns in at least two sources of HQSD, plans for student data collection, and assists students with goal setting and progress monitoring.',
        },
        accomplishedActions: [
          'Use at least two HQSD sources (formative assessments, benchmarks, value-added) to set measurable growth goals.',
          'Build student-facing data trackers so students monitor their own progress.',
          'Reference specific data trends in your pre-conference and growth plan.',
        ],
      },
      {
        id: 'connections_learning',
        name: 'Connections to Prior & Future Learning',
        elements: ['1.2', '2.1', '2.2', '2.4', '2.5'],
        evidenceSources: ['lesson plans', 'pre-conference', 'artifacts'],
        levels: {
          ineffective: 'Plans lessons with no connections to student prior learning or future learning.',
          developing: 'Attempts connections with prior/future learning, but connections are not clear.',
          skilled: 'Plans lessons that make connections with prior and future learning and communicates connections to students.',
          accomplished: 'Intentionally makes clear, coherent connections among lesson content, other disciplines, and real-world experiences; uses input from families, colleagues, and professionals.',
        },
        accomplishedActions: [
          'Open lessons with an explicit "where we\'ve been / where we\'re going" anchor chart.',
          'Connect content to real-world careers or community experiences in Ohio.',
          'Gather prior-knowledge input from families or support staff for individual students.',
        ],
      },
      {
        id: 'standards_alignment',
        name: 'Connections to Standards & District Priorities',
        elements: ['2.3', '4.1', '4.7'],
        evidenceSources: ['lesson plans', 'artifacts', 'pre-conference'],
        levels: {
          ineffective: 'Instructional plan does not reference Ohio Learning Standards.',
          developing: 'References Ohio Learning Standards, but goals and activities do not align with student needs or standards.',
          skilled: 'Incorporates activities, assessments, and resources aligned with student needs, district priorities, and Ohio Learning Standards.',
          accomplished: 'Participates in studying and evaluating advances in content and/or provides input on school and district curriculum.',
        },
        accomplishedActions: [
          'Cite specific Ohio Learning Standards in every observation lesson plan.',
          'Volunteer for a curriculum review or standards-alignment committee.',
          'Share a crosswalk showing how your unit addresses district priorities.',
        ],
      },
    ],
  },
  {
    id: 'knowledge_of_students',
    name: 'Knowledge of Students',
    area: 'instructional_planning',
    standards: ['Students', 'Instruction', 'Collaboration & Communication'],
    components: [
      {
        id: 'whole_child_planning',
        name: 'Planning for the Whole Child',
        elements: ['1.2', '1.4', '1.5', '4.2', '4.4', '6.4'],
        evidenceSources: ['analysis of student data', 'pre-conference', 'artifacts', 'student surveys'],
        levels: {
          ineffective: 'Instructional plan makes no connections to student experiences, culture, developmental characteristics, or backgrounds.',
          developing: 'Makes minimal connections to student experiences, culture, developmental characteristics, or backgrounds.',
          skilled: 'Reflects connections to student experiences, culture, and developmental characteristics including prior learning, abilities, strengths, needs, talents, backgrounds, skills, language proficiency, and interests.',
          accomplished: 'Draws upon input from school professionals and outside resources; reflects consistent connections to individual student needs.',
        },
        accomplishedActions: [
          'Maintain a student interest/inventory survey and reference it in planning.',
          'Consult with intervention specialists or ESL staff about individual learners before observations.',
          'Document how you adjusted a lesson based on a specific student\'s culture or background.',
        ],
      },
    ],
  },
  {
    id: 'lesson_delivery',
    name: 'Lesson Delivery',
    area: 'instruction_and_assessment',
    standards: ['Content', 'Assessment', 'Instruction', 'Learning Environment', 'Collaboration & Communication'],
    components: [
      {
        id: 'communication_students',
        name: 'Communication with Students',
        elements: ['2.2', '4.3', '4.6', '6.1'],
        evidenceSources: ['formal observation', 'walkthroughs', 'pre/post-conference'],
        levels: {
          ineffective: 'Does not communicate learning goals or model exemplary performance; no content knowledge demonstration; no student engagement.',
          developing: 'Inconsistently communicates goals and models; limited differentiated goals; limited content-specific language; little engagement.',
          skilled: 'Consistently communicates differentiated learning goals, expectations, and models; uses content-specific strategies; questioning checks understanding and encourages higher-level thinking.',
          accomplished: 'Uses multiple communication techniques for differentiated goals; stimulates higher-level and creative thinking and student-to-student interactions.',
        },
        accomplishedActions: [
          'Post learning targets in student-friendly language and refer to them throughout the lesson.',
          'Use accountable talk stems to promote student-to-student discourse.',
          'Model exemplar work before students practice independently.',
        ],
      },
      {
        id: 'feedback_students',
        name: 'Feedback to Students',
        elements: ['3.4'],
        evidenceSources: ['formal observation', 'walkthroughs', 'artifacts'],
        levels: {
          ineffective: 'Does not give students feedback.',
          developing: 'Feedback is general, occasional, or limited and may not always support student learning.',
          skilled: 'Gives substantive, specific, and timely feedback to support learning.',
          accomplished: 'Gives substantive feedback supporting individual learning; provides opportunities for self-assessment, peer feedback, and reflection on strengths and challenges.',
        },
        accomplishedActions: [
          'Build a peer feedback protocol into observation lessons.',
          'Use success criteria rubrics so students self-assess before you give feedback.',
          'Conference with individual students using their work as evidence.',
        ],
      },
      {
        id: 'monitoring_understanding',
        name: 'Monitoring Student Understanding',
        elements: ['3.2', '3.3'],
        evidenceSources: ['formal observation', 'walkthroughs'],
        levels: {
          ineffective: 'Fails to monitor and address student confusion and misconceptions.',
          developing: 'Inconsistently monitors or incorrectly addresses confusion and misconceptions.',
          skilled: 'Consistently monitors and addresses common confusion by presenting information in multiple formats.',
          accomplished: 'Anticipates individual student confusion and misconceptions; presents information in multiple formats and clarifies as challenges arise.',
        },
        accomplishedActions: [
          'Use exit tickets or whiteboards every 10–15 minutes during observations.',
          'Plan anticipated misconceptions and pre-write re-teaching moves.',
          'Adjust pacing in real time based on formative check data.',
        ],
      },
      {
        id: 'student_centered_learning',
        name: 'Student-Centered Learning & Differentiation',
        elements: ['3.5', '4.5', '4.6', '5.3', '5.4'],
        evidenceSources: ['formal observation', 'walkthroughs', 'lesson plans'],
        levels: {
          ineffective: 'Learning is entirely teacher-directed; no student choice; no differentiated strategies.',
          developing: 'Few opportunities for student choice; limited differentiated strategies or resources.',
          skilled: 'Gives opportunities for student choice about learning paths; uses differentiated strategies for groups; balances teacher-directed and student-directed learning.',
          accomplished: 'Students actively develop goals toward mastery and decide how to demonstrate learning; strategies, pacing, and resources differentiated for individual students.',
        },
        accomplishedActions: [
          'Offer a choice board for how students demonstrate mastery during your observation.',
          'Use flexible grouping based on formative data, not fixed ability groups.',
          'Let students set a personal learning goal aligned to the lesson objective.',
        ],
      },
    ],
  },
  {
    id: 'classroom_environment',
    name: 'Classroom Environment',
    area: 'instruction_and_assessment',
    standards: ['Students', 'Learning Environment'],
    components: [
      {
        id: 'routines_procedures',
        name: 'Classroom Routines & Procedures',
        elements: ['5.5'],
        evidenceSources: ['formal observation', 'walkthroughs', 'peer review'],
        levels: {
          ineffective: 'No established routines; ineffective transitions; significant loss of instructional time; frequent off-task behavior.',
          developing: 'Establishes routines but uses them inconsistently; transitions sometimes ineffective.',
          skilled: 'Consistently uses routines, procedures, and transitions that maximize instructional time; students assume appropriate responsibility.',
          accomplished: 'Teacher and students collaboratively established routines; students initiate responsibility for effective classroom operation.',
        },
        accomplishedActions: [
          'Co-create classroom procedures with students at the start of the year.',
          'Assign student leadership roles for transitions during observations.',
          'Practice routines until they are automatic before formal observations.',
        ],
      },
      {
        id: 'climate_culture',
        name: 'Classroom Climate & Cultural Competency',
        elements: ['1.4', '5.1', '5.2'],
        evidenceSources: ['formal observation', 'walkthroughs', 'student surveys', 'peer review'],
        levels: {
          ineffective: 'No evidence of rapport or expectations for respectful interactions; no regard for student perspectives or well-being.',
          developing: 'Some evidence of rapport; inconsistent regard for student perspectives, experiences, and culture.',
          skilled: 'Consistent rapport and expectations; models behaviors creating openness, respect, and care; anticipates well-being needs.',
          accomplished: 'Intentionally creates environment with consistent rapport; seeks and is receptive to individual student thoughts; includes other professionals and community resources.',
        },
        accomplishedActions: [
          'Display student work and culturally responsive materials that reflect your class community.',
          'Use restorative practices when conflicts arise instead of punitive responses.',
          'Survey students on classroom climate and act on their feedback.',
        ],
      },
    ],
  },
  {
    id: 'assessment_of_learning',
    name: 'Assessment of Student Learning',
    area: 'instruction_and_assessment',
    standards: ['Students', 'Assessment'],
    components: [
      {
        id: 'use_of_assessments',
        name: 'Use of Assessments',
        elements: ['3.1', '3.2', '3.3', '3.4'],
        evidenceSources: ['pre-conference', 'formal observation', 'assessments', 'student portfolios'],
        levels: {
          ineffective: 'Does not use varied assessments; fails to analyze data or modify instruction; does not share evidence with students.',
          developing: 'Limited use of varied assessments; attempts to analyze data but modifications do not meet student needs.',
          skilled: 'Selects and uses multiple diagnostic, formative, and summative assessments; analyzes patterns to modify instruction for groups; shares evidence with parents and students.',
          accomplished: 'Strategically selects differentiated assessment choices; analyzes data trends for individual needs; shares evidence with colleagues, parents, and students collaboratively.',
        },
        accomplishedActions: [
          'Use a diagnostic → formative → summative assessment cycle in your observation unit.',
          'Bring assessment data to a PLC and co-plan instructional adjustments.',
          'Give students assessment choice (written, oral, project) to demonstrate mastery.',
        ],
      },
      {
        id: 'evidence_of_learning',
        name: 'Evidence of Student Learning',
        elements: ['1.3'],
        evidenceSources: ['assessments', 'student portfolios', 'analysis of student data'],
        levels: {
          ineffective: 'Assessment data demonstrates no evidence of growth and/or achievement over time.',
          developing: 'Uses one source of HQSD to demonstrate appropriate growth for some students.',
          skilled: 'Uses at least two sources of HQSD showing clear evidence of expected growth for most students.',
          accomplished: 'Uses at least two sources of HQSD showing clear evidence of above-expected growth for most students.',
        },
        accomplishedActions: [
          'Document pre/post assessment growth for your SLO or student growth measure.',
          'Pair value-added or benchmark data with classroom formative evidence.',
          'Show individual student growth trajectories, not just class averages.',
        ],
      },
    ],
  },
  {
    id: 'professional_responsibilities',
    name: 'Professional Responsibilities',
    area: 'professionalism',
    standards: ['Collaboration & Communication', 'Professional Responsibility & Growth'],
    components: [
      {
        id: 'family_communication',
        name: 'Communication & Collaboration with Families',
        elements: ['6.1', '6.2'],
        evidenceSources: ['Professional Growth Plan', 'pre/post-conference', 'artifacts'],
        levels: {
          ineffective: 'Does not communicate with students and families.',
          developing: 'Inconsistently or unsuccessfully uses communication strategies with students and families.',
          skilled: 'Uses effective communication and engagement strategies resulting in partnerships that contribute to student learning, well-being, and development.',
          accomplished: 'Uses multiple effective strategies with individual students and families; promotes two-way communication, active participation, and partnerships.',
        },
        accomplishedActions: [
          'Send personalized positive outreach to families monthly, not just when problems arise.',
          'Offer flexible conference times and follow up with action items.',
          'Use translation tools or bilingual resources for ELL families.',
        ],
      },
      {
        id: 'colleague_collaboration',
        name: 'Communication & Collaboration with Colleagues',
        elements: ['6.3'],
        evidenceSources: ['Professional Growth Plan', 'peer review', 'artifacts'],
        levels: {
          ineffective: 'Does not communicate and/or collaborate with colleagues.',
          developing: 'Inconsistently communicates and collaborates with colleagues, resulting in limited improvement.',
          skilled: 'Effectively communicates and collaborates to examine practice and analyze student work/data to implement targeted strategies.',
          accomplished: 'Initiates effective communication and collaboration outside the classroom, improving student learning, individual practice, school practice, and/or the profession.',
        },
        accomplishedActions: [
          'Lead or co-lead a PLC focused on a specific instructional problem of practice.',
          'Mentor a new teacher or host a peer observation exchange.',
          'Present a strategy from your classroom at a staff meeting or district PD.',
        ],
      },
      {
        id: 'district_policies',
        name: 'District Policies & Professional Responsibilities',
        elements: ['7.1'],
        evidenceSources: ['Professional Growth Plan', 'artifacts', 'self-assessment'],
        levels: {
          ineffective: 'Demonstrates lack of understanding of district policies, regulations, and the Licensure Code.',
          developing: 'Demonstrates minimal understanding of district policies, regulations, and the Licensure Code.',
          skilled: 'Demonstrates understanding by following district policies, regulations, and the Licensure Code.',
          accomplished: 'Exemplifies effective leadership beyond the classroom; helps shape policy at the school, district, or state level.',
        },
        accomplishedActions: [
          'Serve on a school or district committee (safety, curriculum, PBIS, etc.).',
          'Stay current on ODE updates and share relevant changes with your team.',
          'Model ethical use of AI, data privacy, and social media per the Licensure Code.',
        ],
      },
      {
        id: 'professional_learning',
        name: 'Professional Learning & Growth',
        elements: ['7.2', '7.3'],
        evidenceSources: ['Professional Growth Plan', 'pre/post-conference', 'artifacts'],
        levels: {
          ineffective: 'Sets professional goals but fails to monitor progress or take action.',
          developing: 'Sets and monitors goals but fails to take action to meet them.',
          skilled: 'Sets, monitors, and takes action on short-term and long-term professional goals aligned with student needs.',
          accomplished: 'Sets ambitious goals, takes action, reflects on impact on student learning, and adjusts practice; contributes to colleagues\' professional growth.',
        },
        accomplishedActions: [
          'Tie every growth plan goal directly to a rubric component and HQSD evidence.',
          'Document quarterly reflections on goal progress with student impact data.',
          'Share your professional learning takeaways with grade-level or department colleagues.',
        ],
      },
    ],
  },
];

export function getAllComponents() {
  return OTES_RUBRIC.flatMap(domain => domain.components.map(component => ({ ...component, domainId: domain.id, domainName: domain.name })));
}

export function getComponentById(componentId: string) {
  for (const domain of OTES_RUBRIC) {
    const component = domain.components.find(c => c.id === componentId);
    if (component) return { component, domain };
  }
  return null;
}

export function getDomainById(domainId: string) {
  return OTES_RUBRIC.find(d => d.id === domainId) ?? null;
}

export function levelScore(level: string | null | undefined): number {
  const found = PERFORMANCE_LEVELS.find(l => l.id === level);
  return found?.score ?? -1;
}
