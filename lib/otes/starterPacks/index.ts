import type { OtesWorkspace } from '../types';
import { newId } from '../storage';
import { createTask } from '../tasks';
import {
  WOODS_TECH_ACTIONS,
  WOODS_TECH_LESSON_PLANS,
  WOODS_TECH_PROFILE,
} from './woodsTechnology';

export type StarterPackId = 'woods_technology';

export const STARTER_PACKS: Record<StarterPackId, { label: string; description: string }> = {
  woods_technology: {
    label: 'Woods Technology (WT1 & WT2–4)',
    description:
      'Sample task notes and observation lesson plans for a shop teacher teaching basic carpentry and advanced woods classes.',
  },
};

export function applyStarterPack(workspace: OtesWorkspace, packId: StarterPackId): OtesWorkspace {
  if (packId !== 'woods_technology') return workspace;

  const now = new Date().toISOString();
  const sampleTasks = WOODS_TECH_ACTIONS.map(action =>
    createTask(action.categoryId, action.title, action.description),
  );

  return {
    ...workspace,
    profile: { ...workspace.profile, ...WOODS_TECH_PROFILE },
    tasks: [...sampleTasks, ...workspace.tasks],
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
