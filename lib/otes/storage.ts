import { WOODS_TECH_PROFILE } from './starterPacks/woodsTechnology';
import { OTES_RUBRIC } from './rubric';
import { initializeWorkspaceTasks, migrateTasksToStrategies } from './tasks';
import type { CategoryRating, OtesWorkspace, TeacherProfile } from './types';

export const STORAGE_KEY = 'otes-coach-workspace-v8';
const LEGACY_STORAGE_KEYS = ['otes-coach-workspace-v7', 'otes-coach-workspace-v6', 'otes-coach-workspace-v5', 'otes-coach-workspace-v4', 'otes-coach-workspace-v3', 'otes-coach-workspace-v2', 'otes-coach-workspace-v1'] as const;

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
  return OTES_RUBRIC.map(domain => ({
    categoryId: domain.id,
    currentLevel: null,
    goal: '',
    strategy: '',
    updatedAt: now,
  }));
}

export function createDefaultWorkspace(): OtesWorkspace {
  const workspace: OtesWorkspace = {
    version: 3,
    profile: defaultProfile(),
    categoryRatings: defaultCategoryRatings(),
    tasks: [],
    actions: [],
    coachMessages: [],
    evalLessonPlans: [],
    updatedAt: new Date().toISOString(),
  };
  return initializeWorkspaceTasks(workspace);
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

  return initializeWorkspaceTasks({
    ...base,
    profile,
    categoryRatings,
    actions,
    evalLessonPlans,
    updatedAt: new Date().toISOString(),
  });
}

function mergeWorkspace(saved: Partial<OtesWorkspace>): OtesWorkspace {
  const defaults = createDefaultWorkspace();
  const ratingMap = new Map((saved.categoryRatings ?? []).map(r => [r.categoryId, r]));
  const merged: OtesWorkspace = {
    ...defaults,
    ...saved,
    version: 3,
    profile: { ...defaults.profile, ...(saved.profile ?? {}) },
    categoryRatings: defaults.categoryRatings.map(r => {
      const savedRating = ratingMap.get(r.categoryId);
      if (!savedRating) return r;
      return {
        ...r,
        ...savedRating,
      };
    }),
    tasks: saved.tasks ?? [],
    actions: saved.actions ?? [],
    coachMessages: saved.coachMessages ?? [],
    evalLessonPlans: saved.evalLessonPlans ?? [],
    updatedAt: saved.updatedAt ?? new Date().toISOString(),
  };
  return initializeWorkspaceTasks(merged);
}

function readStoredWorkspace(): Partial<OtesWorkspace> | null {
  if (typeof window === 'undefined') return null;
  const current = localStorage.getItem(STORAGE_KEY);
  if (current) return JSON.parse(current) as Partial<OtesWorkspace>;

  for (const legacyKey of LEGACY_STORAGE_KEYS) {
    const legacy = localStorage.getItem(legacyKey);
    if (!legacy) continue;
    if (legacyKey === 'otes-coach-workspace-v1') {
      return migrateFromLegacy(JSON.parse(legacy) as LegacyWorkspace);
    }
    return JSON.parse(legacy) as Partial<OtesWorkspace>;
  }

  return null;
}

export function loadWorkspace(): OtesWorkspace {
  if (typeof window === 'undefined') return createDefaultWorkspace();
  try {
    const stored = readStoredWorkspace();
    if (!stored) return finalizeWorkspace(createDefaultWorkspace());
    if ('actions' in stored && Array.isArray(stored.actions)) {
      return finalizeWorkspace(mergeWorkspace(stored));
    }
    return finalizeWorkspace(migrateFromLegacy(stored as LegacyWorkspace));
  } catch {
    return finalizeWorkspace(createDefaultWorkspace());
  }
}

function finalizeWorkspace(workspace: OtesWorkspace): OtesWorkspace {
  const upgradingFromV5 = typeof window !== 'undefined'
    && !localStorage.getItem(STORAGE_KEY)
    && Boolean(localStorage.getItem('otes-coach-workspace-v5'));
  const upgradingFromV6 = typeof window !== 'undefined'
    && !localStorage.getItem(STORAGE_KEY)
    && Boolean(localStorage.getItem('otes-coach-workspace-v6'));
  const upgradingFromV7 = typeof window !== 'undefined'
    && !localStorage.getItem(STORAGE_KEY)
    && Boolean(localStorage.getItem('otes-coach-workspace-v7'));
  let next = initializeWorkspaceTasks({ ...workspace, version: 3, tasks: workspace.tasks ?? [] });
  if (upgradingFromV5 || upgradingFromV6 || upgradingFromV7) {
    next = migrateTasksToStrategies(next);
  }
  if (!localStorage.getItem(STORAGE_KEY)) {
    saveWorkspace(next);
  }
  return next;
}

export function saveWorkspace(workspace: OtesWorkspace) {
  if (typeof window === 'undefined') return;
  const next = { ...workspace, updatedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export const WORKSPACE_FILENAME = 'otes-workspace.json';

export function exportWorkspaceJson(workspace: OtesWorkspace): string {
  return JSON.stringify(workspace, null, 2);
}

export function downloadWorkspaceBackup(workspace: OtesWorkspace) {
  const blob = new Blob([exportWorkspaceJson(workspace)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = WORKSPACE_FILENAME;
  link.click();
  URL.revokeObjectURL(url);
}

export function importWorkspaceFromJson(json: string): OtesWorkspace {
  const parsed = JSON.parse(json) as Partial<OtesWorkspace>;
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid backup file.');
  }
  const merged = mergeWorkspace(parsed);
  const next = initializeWorkspaceTasks({ ...merged, version: 3 });
  const saved = saveWorkspace(next);
  if (!saved) throw new Error('Could not save imported data.');
  return saved;
}

export function newId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
