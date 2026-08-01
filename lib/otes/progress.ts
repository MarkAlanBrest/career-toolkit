import { OTES_RUBRIC, levelScore } from './rubric';
import type { ComponentRating, OtesWorkspace, ProgressSummary } from './types';

export function computeProgress(ratings: ComponentRating[]): ProgressSummary {
  const allComponents = OTES_RUBRIC.flatMap(d => d.components);
  const ratingMap = new Map(ratings.map(r => [r.componentId, r]));

  let accomplishedCount = 0;
  let skilledCount = 0;
  let developingCount = 0;
  let ineffectiveCount = 0;
  let unratedCount = 0;
  let totalScore = 0;
  let ratedCount = 0;

  for (const component of allComponents) {
    const rating = ratingMap.get(component.id);
    const level = rating?.currentLevel ?? null;
    if (!level) {
      unratedCount += 1;
      continue;
    }
    ratedCount += 1;
    const score = levelScore(level);
    totalScore += score;
    if (level === 'accomplished') accomplishedCount += 1;
    else if (level === 'skilled') skilledCount += 1;
    else if (level === 'developing') developingCount += 1;
    else ineffectiveCount += 1;
  }

  const domainProgress = OTES_RUBRIC.map(domain => {
    const componentScores = domain.components.map(component => {
      const rating = ratingMap.get(component.id);
      return levelScore(rating?.currentLevel);
    });
    const validScores = componentScores.filter(s => s >= 0);
    const percent = validScores.length
      ? Math.round((validScores.reduce((a, b) => a + b, 0) / (validScores.length * 3)) * 100)
      : 0;
    const gapCount = domain.components.filter(component => {
      const rating = ratingMap.get(component.id);
      return !rating?.currentLevel || rating.currentLevel !== 'accomplished';
    }).length;
    return {
      domainId: domain.id,
      domainName: domain.name,
      percent,
      gapCount,
    };
  });

  const overallPercent = ratedCount
    ? Math.round((totalScore / (ratedCount * 3)) * 100)
    : 0;

  return {
    overallPercent,
    accomplishedCount,
    skilledCount,
    developingCount,
    ineffectiveCount,
    unratedCount,
    totalComponents: allComponents.length,
    domainProgress,
  };
}

export function getGapComponents(workspace: OtesWorkspace) {
  const ratingMap = new Map(workspace.ratings.map(r => [r.componentId, r]));
  const gaps: Array<{
    componentId: string;
    componentName: string;
    domainId: string;
    domainName: string;
    currentLevel: string | null;
    gapSize: number;
  }> = [];

  for (const domain of OTES_RUBRIC) {
    for (const component of domain.components) {
      const rating = ratingMap.get(component.id);
      const current = rating?.currentLevel ?? null;
      if (current === 'accomplished') continue;
      const currentScore = levelScore(current);
      gaps.push({
        componentId: component.id,
        componentName: component.name,
        domainId: domain.id,
        domainName: domain.name,
        currentLevel: current,
        gapSize: 3 - Math.max(0, currentScore),
      });
    }
  }

  return gaps.sort((a, b) => b.gapSize - a.gapSize);
}

export function daysUntil(dateIso: string): number | null {
  if (!dateIso) return null;
  const target = new Date(dateIso);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}
