import type { OtesWorkspace } from '../types';
import { newId } from '../storage';
import {
  WOODS_TECH_ACTIONS,
  WOODS_TECH_LESSON_PLANS,
  WOODS_TECH_PROFILE,
  buildWoodsTechCategoryRatings,
} from './woodsTechnology';

export type StarterPackId = 'woods_technology';

export const STARTER_PACKS: Record<StarterPackId, { label: string; description: string }> = {
  woods_technology: {
    label: 'Woods Technology (WT1 & WT2–4)',
    description:
      'Goals, strategies, sample actions, and observation lesson plans for a shop teacher teaching basic carpentry and advanced woods classes.',
  },
};

export function applyStarterPack(workspace: OtesWorkspace, packId: StarterPackId): OtesWorkspace {
  if (packId !== 'woods_technology') return workspace;

  const now = new Date().toISOString();

  return {
    ...workspace,
    profile: { ...workspace.profile, ...WOODS_TECH_PROFILE },
    categoryRatings: buildWoodsTechCategoryRatings(workspace.categoryRatings, { onlyIfEmpty: true }),
    actions: [
      ...WOODS_TECH_ACTIONS.map(action => ({
        ...action,
        id: newId('action'),
        createdAt: now,
      })),
      ...workspace.actions,
    ],
    evalLessonPlans: [
      ...WOODS_TECH_LESSON_PLANS.map(plan => ({
        ...plan,
        id: newId('plan'),
        createdAt: now,
      })),
      ...workspace.evalLessonPlans,
    ],
    updatedAt: now,
  };
}
