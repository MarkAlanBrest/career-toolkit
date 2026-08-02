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
  return guidance.strategies.map(label => createTask(categoryId, label));
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

/** Align saved tasks with rubric strategies; keep custom tasks the user added. */
export function migrateTasksToStrategies(workspace: OtesWorkspace): OtesWorkspace {
  const tasks: CategoryTask[] = [];

  for (const domain of OTES_RUBRIC) {
    const guidance = getCategoryGuidance(domain.id);
    const oldTasks = workspace.tasks.filter(task => task.categoryId === domain.id);
    const oldByLabel = new Map(oldTasks.map(task => [task.label, task]));
    const strategyLabels = new Set(guidance.strategies);
    const usedIds = new Set<string>();

    for (const strategy of guidance.strategies) {
      const existing = oldByLabel.get(strategy);
      if (existing) {
        tasks.push(existing);
        usedIds.add(existing.id);
      } else {
        tasks.push(createTask(domain.id, strategy));
      }
    }

    for (const old of oldTasks) {
      if (!usedIds.has(old.id) && !strategyLabels.has(old.label)) {
        tasks.push(old);
      }
    }
  }

  return { ...workspace, tasks };
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
