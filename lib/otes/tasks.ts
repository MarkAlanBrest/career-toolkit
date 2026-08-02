import { getCategoryGuidance } from './categoryGuidance';
import { OTES_RUBRIC } from './rubric';
import type { CategoryTask, OtesWorkspace } from './types';

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createTask(
  categoryId: string,
  label: string,
  notes = '',
): CategoryTask {
  const now = new Date().toISOString();
  return {
    id: makeId('task'),
    categoryId,
    label,
    notes,
    createdAt: now,
    updatedAt: now,
  };
}

export function buildDefaultTasksForCategory(categoryId: string): CategoryTask[] {
  const guidance = getCategoryGuidance(categoryId);
  const labels = [...guidance.dailyHabits, ...guidance.weeklyHabits];
  return labels.map(label => createTask(categoryId, label));
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
    tasks.push(createTask(action.categoryId, action.title, action.description));
  }

  return { ...workspace, tasks };
}
