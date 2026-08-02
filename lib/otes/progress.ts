import { OTES_RUBRIC, levelScore } from './rubric';
import type { CategoryProgress, CategoryRating, OtesWorkspace, PerformanceLevel } from './types';

const LEVEL_PERCENT: Record<PerformanceLevel, number> = {
  ineffective: 10,
  developing: 40,
  skilled: 70,
  accomplished: 100,
};

export function computeCategoryProgress(
  categoryId: string,
  rating: CategoryRating | undefined,
  actionCount: number,
  recentActionCount: number,
): CategoryProgress {
  const domain = OTES_RUBRIC.find(d => d.id === categoryId);
  const level = rating?.currentLevel ?? null;
  const basePercent = level ? LEVEL_PERCENT[level] : 0;
  const actionBoost = Math.min(15, actionCount * 2);
  const momentumBoost = Math.min(5, recentActionCount);
  const levelPercent = Math.min(100, basePercent + (level === 'accomplished' ? 0 : actionBoost + momentumBoost));

  return {
    categoryId,
    categoryName: domain?.name ?? categoryId,
    currentLevel: level,
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
    const rating = workspace.categoryRatings.find(r => r.categoryId === domain.id);
    const actions = workspace.actions.filter(a => a.categoryId === domain.id);
    const recent = actions.filter(a => a.date >= cutoff);
    const progress = computeCategoryProgress(domain.id, rating, actions.length, recent.length);
    progress.coachMessageCount = workspace.coachMessages.filter(m => m.categoryId === domain.id).length;
    return progress;
  });
}

export function overallProgress(categories: CategoryProgress[]): number {
  if (!categories.length) return 0;
  const total = categories.reduce((sum, c) => sum + c.levelPercent, 0);
  return Math.round(total / categories.length);
}

export function levelLabel(level: PerformanceLevel | null): string {
  if (!level) return 'Not rated';
  return level.charAt(0).toUpperCase() + level.slice(1);
}

export { levelScore };
