import type { ComponentRating, OtesWorkspace, TeacherProfile } from './types';
import { getAllComponents } from './rubric';

export const STORAGE_KEY = 'otes-coach-workspace-v1';

function defaultProfile(): TeacherProfile {
  return {
    name: '',
    school: '',
    district: '',
    subject: '',
    gradeLevel: '',
    evaluationYear: new Date().getFullYear().toString(),
  };
}

function defaultRatings(): ComponentRating[] {
  const now = new Date().toISOString();
  return getAllComponents().map(component => ({
    componentId: component.id,
    currentLevel: null,
    targetLevel: 'accomplished',
    notes: '',
    updatedAt: now,
  }));
}

export function createDefaultWorkspace(): OtesWorkspace {
  const now = new Date().toISOString();
  return {
    version: 1,
    profile: defaultProfile(),
    ratings: defaultRatings(),
    evidence: [],
    goals: [],
    observations: [],
    lessonPlans: [],
    dismissedSuggestions: [],
    updatedAt: now,
  };
}

export function loadWorkspace(): OtesWorkspace {
  if (typeof window === 'undefined') return createDefaultWorkspace();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createDefaultWorkspace();
    const parsed = JSON.parse(raw) as OtesWorkspace;
    return mergeWorkspace(parsed);
  } catch {
    return createDefaultWorkspace();
  }
}

function mergeWorkspace(saved: Partial<OtesWorkspace>): OtesWorkspace {
  const defaults = createDefaultWorkspace();
  const ratingMap = new Map((saved.ratings ?? []).map(r => [r.componentId, r]));
  const mergedRatings = defaults.ratings.map(defaultRating => {
    const existing = ratingMap.get(defaultRating.componentId);
    return existing ? { ...defaultRating, ...existing } : defaultRating;
  });

  return {
    ...defaults,
    ...saved,
    profile: { ...defaults.profile, ...(saved.profile ?? {}) },
    ratings: mergedRatings,
    evidence: saved.evidence ?? [],
    goals: saved.goals ?? [],
    observations: saved.observations ?? [],
    lessonPlans: saved.lessonPlans ?? [],
    dismissedSuggestions: saved.dismissedSuggestions ?? [],
    updatedAt: saved.updatedAt ?? new Date().toISOString(),
  };
}

export function saveWorkspace(workspace: OtesWorkspace) {
  if (typeof window === 'undefined') return;
  const next = { ...workspace, updatedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

export function exportWorkspace(workspace: OtesWorkspace): string {
  return JSON.stringify(workspace, null, 2);
}

export function importWorkspace(json: string): OtesWorkspace {
  const parsed = JSON.parse(json) as Partial<OtesWorkspace>;
  return mergeWorkspace(parsed);
}

export function newId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}
