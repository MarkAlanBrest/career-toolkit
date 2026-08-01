import { getComponentById } from './rubric';
import { getGapComponents } from './progress';
import type { OtesWorkspace, Suggestion } from './types';

export function generateSuggestions(workspace: OtesWorkspace): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const dismissed = new Set(workspace.dismissedSuggestions);
  const gaps = getGapComponents(workspace);

  if (!workspace.profile.name.trim()) {
    suggestions.push({
      id: 'complete-profile',
      priority: 'medium',
      title: 'Complete your teacher profile',
      description: 'Adding your subject, grade level, and school helps tailor lesson plans and coaching suggestions.',
      actionSteps: ['Open Settings and fill in your profile details.'],
    });
  }

  const unrated = workspace.ratings.filter(r => !r.currentLevel).length;
  if (unrated > 0) {
    suggestions.push({
      id: 'complete-self-assessment',
      priority: 'high',
      title: `Rate ${unrated} unrated rubric component${unrated === 1 ? '' : 's'}`,
      description: 'A complete self-assessment unlocks accurate progress tracking and targeted suggestions.',
      actionSteps: [
        'Go to the Rubric tab and honestly rate each component based on your current practice.',
        'Use your most recent observation feedback as a guide.',
      ],
    });
  }

  for (const gap of gaps.slice(0, 5)) {
    const match = getComponentById(gap.componentId);
    if (!match) continue;
    const id = `gap-${gap.componentId}`;
    if (dismissed.has(id)) continue;
    suggestions.push({
      id,
      priority: gap.gapSize >= 3 ? 'high' : gap.gapSize >= 2 ? 'medium' : 'low',
      title: `Move toward Accomplished: ${gap.componentName}`,
      description: gap.currentLevel
        ? `You rated this ${gap.currentLevel}. Focus here to strengthen your ${gap.domainName} evidence.`
        : `This component is not yet rated in ${gap.domainName}.`,
      componentId: gap.componentId,
      domainId: gap.domainId,
      actionSteps: match.component.accomplishedActions,
    });
  }

  const activeGoals = workspace.goals.filter(g => g.status !== 'completed');
  if (activeGoals.length === 0 && gaps.length > 0) {
    suggestions.push({
      id: 'create-growth-goal',
      priority: 'high',
      title: 'Create a Professional Growth Plan goal',
      description: 'Ohio evaluators expect goals tied to the rubric. Start with your biggest gap area.',
      actionSteps: [
        'Go to Growth Plan and add a goal linked to your weakest rubric component.',
        'Include specific actions and a deadline before your next observation.',
      ],
    });
  }

  const upcomingObs = workspace.observations
    .filter(o => o.type === 'formal' && new Date(o.date) >= new Date())
    .sort((a, b) => a.date.localeCompare(b.date));
  if (upcomingObs.length > 0) {
    const next = upcomingObs[0];
    const days = Math.ceil((new Date(next.date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days <= 14) {
      suggestions.push({
        id: `prep-obs-${next.id}`,
        priority: 'high',
        title: `Prepare for observation in ${days} day${days === 1 ? '' : 's'}`,
        description: 'Build an observation-ready lesson plan that showcases Accomplished-level practices.',
        actionSteps: [
          'Use the Lesson Builder to create a plan targeting your growth areas.',
          'Schedule a pre-conference and bring HQSD evidence.',
          'Review accomplished-level descriptors for your focus domains.',
        ],
      });
    }
  }

  const evidenceCount = workspace.evidence.length;
  if (evidenceCount < 3) {
    suggestions.push({
      id: 'collect-evidence',
      priority: 'medium',
      title: 'Start collecting evaluation evidence',
      description: 'Document artifacts throughout the year — lesson plans, assessment data, family communication logs.',
      actionSteps: [
        'Log at least one piece of evidence per domain in the Evidence tab.',
        'Attach HQSD screenshots or student work samples.',
      ],
    });
  }

  const overdueGoals = workspace.goals.filter(g => {
    if (g.status === 'completed' || !g.deadline) return false;
    return new Date(g.deadline) < new Date();
  });
  for (const goal of overdueGoals.slice(0, 2)) {
    suggestions.push({
      id: `overdue-goal-${goal.id}`,
      priority: 'high',
      title: `Overdue goal: ${goal.title}`,
      description: 'This growth plan goal is past its deadline. Update it or mark progress.',
      componentId: goal.componentId,
      actionSteps: goal.actions.length ? goal.actions : ['Review and update this goal in Growth Plan.'],
    });
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  return suggestions
    .filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i)
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}
