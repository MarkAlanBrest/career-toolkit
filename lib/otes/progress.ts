import { OTES_RUBRIC, levelScore } from './rubric';
import type { CategoryProgress, OtesWorkspace } from './types';

/** Actions logged per category that count as fully documented evidence. */
const ACTIONS_FOR_FULL_EVIDENCE = 5;

export function computeCategoryProgress(
  categoryId: string,
  actionCount: number,
  recentActionCount: number,
): CategoryProgress {
  const domain = OTES_RUBRIC.find(d => d.id === categoryId);
  const basePercent = Math.min(100, Math.round((actionCount / ACTIONS_FOR_FULL_EVIDENCE) * 100));
  const momentumBoost = Math.min(10, recentActionCount * 2);
  const levelPercent = actionCount >= ACTIONS_FOR_FULL_EVIDENCE
    ? 100
    : Math.min(100, basePercent + momentumBoost);

  return {
    categoryId,
    categoryName: domain?.name ?? categoryId,
    levelPercent,
    actionCount,
    recentActionCount,
    coachMessageCount: 0,
  };
}

export function computeAllCategoryProgress(workspace: OtesWorkspace): CategoryProgress[] {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const cutoff = thirtyDaysAgo.toISOString().slice(0, 10);

  return OTES_RUBRIC.map(domain => {
    const actions = workspace.actions.filter(a => a.categoryId === domain.id);
    const recent = actions.filter(a => a.date >= cutoff);
    const progress = computeCategoryProgress(domain.id, actions.length, recent.length);
    progress.coachMessageCount = workspace.coachMessages.filter(m => m.categoryId === domain.id).length;
    return progress;
  });
}

export function overallProgress(categories: CategoryProgress[]): number {
  if (!categories.length) return 0;
  const total = categories.reduce((sum, c) => sum + c.levelPercent, 0);
  return Math.round(total / categories.length);
}

export { levelScore };
