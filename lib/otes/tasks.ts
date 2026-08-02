import { getCategoryGuidance } from './categoryGuidance';
import { OTES_RUBRIC } from './rubric';
import type { CategoryTask, OtesWorkspace } from './types';

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export type TaskCadence = CategoryTask['cadence'];

export function createTask(
  categoryId: string,
  label: string,
  cadence: TaskCadence = 'custom',
  notes = '',
): CategoryTask {
  const now = new Date().toISOString();
  return {
    id: makeId('task'),
    categoryId,
    label,
    notes,
    cadence,
    createdAt: now,
    updatedAt: now,
  };
}

export function buildDefaultTasksForCategory(categoryId: string): CategoryTask[] {
  const guidance = getCategoryGuidance(categoryId);
  return [
    ...guidance.dailyHabits.map(label => createTask(categoryId, label, 'daily')),
    ...guidance.weeklyHabits.map(label => createTask(categoryId, label, 'weekly')),
  ];
}

export function getCategoryTasks(workspace: OtesWorkspace, categoryId: string): CategoryTask[] {
  return workspace.tasks
    .filter(task => task.categoryId === categoryId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function countTasksWithNotes(workspace: OtesWorkspace, categoryId?: string): number {
  return workspace.tasks.filter(task => {
    if (categoryId && task.categoryId !== categoryId) return false;
    return Boolean(task.notes.trim());
  }).length;
}

export function initializeWorkspaceTasks(workspace: OtesWorkspace): OtesWorkspace {
  const tasks = [...workspace.tasks];

  for (const domain of OTES_RUBRIC) {
    if (tasks.some(task => task.categoryId === domain.id)) continue;
    tasks.push(...buildDefaultTasksForCategory(domain.id));
  }

  for (const action of workspace.actions) {
    const alreadyMigrated = tasks.some(
      task => task.id === action.id || (task.categoryId === action.categoryId && task.label === action.title),
    );
    if (alreadyMigrated) continue;
    tasks.push(createTask(action.categoryId, action.title, 'custom', action.description));
  }

  return { ...workspace, tasks };
}

export function cadenceLabel(cadence: TaskCadence): string {
  switch (cadence) {
    case 'daily': return 'Daily';
    case 'weekly': return 'Weekly';
    default: return 'Custom';
  }
}
