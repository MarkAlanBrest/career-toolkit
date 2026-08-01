import { buildWoodsTechCategoryRatings, WOODS_TECH_PROFILE } from './starterPacks/woodsTechnology';
import { OTES_RUBRIC } from './rubric';
import type { CategoryRating, OtesWorkspace, TeacherProfile } from './types';

export const STORAGE_KEY = 'otes-coach-workspace-v2';

function defaultProfile(): TeacherProfile {
  return {
    name: '',
    school: '',
    district: '',
    subject: WOODS_TECH_PROFILE.subject ?? '',
    gradeLevel: WOODS_TECH_PROFILE.gradeLevel ?? '',
    evaluationYear: new Date().getFullYear().toString(),
  };
}

function defaultCategoryRatings(): CategoryRating[] {
  const now = new Date().toISOString();
  const base = OTES_RUBRIC.map(domain => ({
    categoryId: domain.id,
    currentLevel: null,
    goal: '',
    strategy: '',
    updatedAt: now,
  }));
  return buildWoodsTechCategoryRatings(base);
}

export function createDefaultWorkspace(): OtesWorkspace {
  return {
    version: 2,
    profile: defaultProfile(),
    categoryRatings: defaultCategoryRatings(),
    actions: [],
    coachMessages: [],
    evalLessonPlans: [],
    updatedAt: new Date().toISOString(),
  };
}

type LegacyWorkspace = {
  version?: number;
  profile?: Partial<TeacherProfile>;
  evidence?: Array<{ id: string; componentId: string; title: string; description: string; date: string; createdAt: string }>;
  lessonPlans?: Array<{ id: string; topic?: string; title: string; subject: string; gradeLevel: string; duration: string; targetDomains?: string[]; objective: string; standards: string; hook: string; instruction: string[]; differentiation: string[]; assessment: string[]; closure: string; otesEvidence: string[]; createdAt: string }>;
  ratings?: Array<{ componentId: string; currentLevel: string | null }>;
  [key: string]: unknown;
};

function componentToCategory(componentId: string): string {
  for (const domain of OTES_RUBRIC) {
    if (domain.components.some(c => c.id === componentId)) return domain.id;
  }
  return OTES_RUBRIC[0].id;
}

function migrateFromLegacy(raw: LegacyWorkspace): OtesWorkspace {
  const base = createDefaultWorkspace();
  const profile = { ...base.profile, ...(raw.profile ?? {}) };

  const actions = (raw.evidence ?? []).map(e => ({
    id: e.id,
    categoryId: componentToCategory(e.componentId),
    date: e.date || e.createdAt.slice(0, 10),
    title: e.title,
    description: e.description,
    createdAt: e.createdAt,
  }));

  const evalLessonPlans = (raw.lessonPlans ?? []).map(lp => ({
    id: lp.id,
    topic: lp.topic || lp.title,
    title: lp.title,
    subject: lp.subject,
    gradeLevel: lp.gradeLevel,
    duration: lp.duration,
    categoryId: lp.targetDomains?.[0] || OTES_RUBRIC[0].id,
    objective: lp.objective,
    standards: lp.standards,
    hook: lp.hook,
    instruction: lp.instruction,
    differentiation: lp.differentiation,
    assessment: lp.assessment,
    closure: lp.closure,
    otesEvidence: lp.otesEvidence,
    createdAt: lp.createdAt,
  }));

  const categoryRatings = base.categoryRatings.map(rating => {
    const domain = OTES_RUBRIC.find(d => d.id === rating.categoryId);
    if (!domain) return rating;
    const componentLevels = domain.components
      .map(c => raw.ratings?.find(r => r.componentId === c.id)?.currentLevel)
      .filter(Boolean) as string[];
    if (!componentLevels.length) return rating;
    const scores = componentLevels.map(l => {
      const order = ['ineffective', 'developing', 'skilled', 'accomplished'];
      return order.indexOf(l);
    });
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const level = ['ineffective', 'developing', 'skilled', 'accomplished'][Math.round(avg)] as CategoryRating['currentLevel'];
    return { ...rating, currentLevel: level, updatedAt: new Date().toISOString() };
  });

  return {
    ...base,
    profile,
    categoryRatings,
    actions,
    evalLessonPlans,
    updatedAt: new Date().toISOString(),
  };
}

export function loadWorkspace(): OtesWorkspace {
  if (typeof window === 'undefined') return createDefaultWorkspace();
  try {
    const v2 = localStorage.getItem(STORAGE_KEY);
    if (v2) return mergeWorkspace(JSON.parse(v2) as Partial<OtesWorkspace>);
    const v1 = localStorage.getItem('otes-coach-workspace-v1');
    if (v1) {
      const migrated = migrateFromLegacy(JSON.parse(v1) as LegacyWorkspace);
      saveWorkspace(migrated);
      return migrated;
    }
    return createDefaultWorkspace();
  } catch {
    return createDefaultWorkspace();
  }
}

function mergeWorkspace(saved: Partial<OtesWorkspace>): OtesWorkspace {
  const defaults = createDefaultWorkspace();
  const ratingMap = new Map((saved.categoryRatings ?? []).map(r => [r.categoryId, r]));
  return {
    ...defaults,
    ...saved,
    version: 2,
    profile: { ...defaults.profile, ...(saved.profile ?? {}) },
    categoryRatings: defaults.categoryRatings.map(r => {
      const saved = ratingMap.get(r.categoryId);
      if (!saved) return r;
      return {
        ...r,
        ...saved,
        goal: saved.goal?.trim() ? saved.goal : r.goal,
        strategy: saved.strategy?.trim() ? saved.strategy : r.strategy,
      };
    }),
    actions: saved.actions ?? [],
    coachMessages: saved.coachMessages ?? [],
    evalLessonPlans: saved.evalLessonPlans ?? [],
    updatedAt: saved.updatedAt ?? new Date().toISOString(),
  };
}

export function saveWorkspace(workspace: OtesWorkspace) {
  if (typeof window === 'undefined') return;
  const next = { ...workspace, updatedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function newId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
