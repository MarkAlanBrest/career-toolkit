import { getCategoryGuidance } from './categoryGuidance';
import { OTES_RUBRIC, buildCategoryAccomplishedGoalText } from './rubric';
import type { CategoryAction, OtesWorkspace } from './types';

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

function reportStyles() {
  return `
    body { font-family: Calibri, Arial, sans-serif; color: #1a2b3c; margin: 48px; line-height: 1.5; }
    h1 { color: #1a3a5c; font-size: 24pt; margin-bottom: 6px; border-bottom: 3px solid #1e5f4a; padding-bottom: 8px; }
    h2 { color: #2d5a87; font-size: 14pt; margin-top: 28px; margin-bottom: 8px; }
    h3 { color: #1a3a5c; font-size: 12pt; margin-top: 18px; margin-bottom: 6px; }
    .meta { color: #5a6f83; font-size: 11pt; margin-bottom: 24px; }
    .badge { display: inline-block; background: #e8f2ec; color: #1e5f4a; padding: 4px 12px; border-radius: 4px; font-weight: bold; font-size: 11pt; }
    .section { margin-bottom: 20px; }
    .action { border-left: 4px solid #2d5a87; padding: 10px 14px; margin-bottom: 12px; background: #f8fafc; }
    .action-date { font-size: 10pt; color: #6b7f93; font-weight: bold; }
    ul { margin: 8px 0; padding-left: 22px; }
    li { margin-bottom: 6px; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #d8e2ec; font-size: 10pt; color: #6b7f93; }
    .goal-box { background: #f5f8fb; border: 1px solid #d8e2ec; padding: 14px 18px; border-radius: 6px; }
  `;
}

function buildCategorySection(
  categoryId: string,
  actions: CategoryAction[],
) {
  const domain = OTES_RUBRIC.find(d => d.id === categoryId);
  if (!domain) return '';

  const guidance = getCategoryGuidance(categoryId);
  const rubricTarget = buildCategoryAccomplishedGoalText(categoryId);

  const actionsHtml = actions.length
    ? actions
        .sort((a, b) => b.date.localeCompare(a.date))
        .map(
          a => `
        <div class="action">
          <div class="action-date">${escapeHtml(formatDate(a.date))}</div>
          <strong>${escapeHtml(a.title)}</strong>
          ${a.description ? `<p style="margin:6px 0 0">${escapeHtml(a.description)}</p>` : ''}
        </div>`,
        )
        .join('')
    : '<p><em>No actions logged yet for this category.</em></p>';

  return `
    <h1>${escapeHtml(domain.name)}</h1>
    <div class="meta">
      Ohio Teacher Evaluation System (OTES) 2.0 · ${escapeHtml(ORGANIZATIONAL_AREA_LABEL(domain.area))}
    </div>

    <div class="section goal-box">
      <h3 style="margin-top:0">OTES 2.0 Rubric Target — Accomplished</h3>
      <p style="white-space:pre-wrap">${escapeHtml(rubricTarget)}</p>
      <p style="margin-bottom:0">Target: <strong>Accomplished</strong></p>
    </div>

    <h2>What Accomplished Looks Like</h2>
    <p>${escapeHtml(guidance.accomplishedSummary)}</p>

    <h2>Actions I Took</h2>
    ${actionsHtml}

    <h2>OTES 2.0 Rubric Components in This Domain</h2>
    <ul>
      ${domain.components.map(c => `<li><strong>${escapeHtml(c.name)}</strong> — ${escapeHtml(c.levels.accomplished)}</li>`).join('')}
    </ul>
  `;
}

function ORGANIZATIONAL_AREA_LABEL(area: string) {
  const labels: Record<string, string> = {
    instructional_planning: 'Instructional Planning',
    instruction_and_assessment: 'Instruction & Assessment',
    professionalism: 'Professionalism',
  };
  return labels[area] ?? area;
}

function reportHeader(workspace: OtesWorkspace, title: string) {
  const p = workspace.profile;
  return `
    <p class="meta">
      <strong>${escapeHtml(p.name || 'Teacher')}</strong>
      ${p.school ? ` · ${escapeHtml(p.school)}` : ''}
      ${p.district ? ` · ${escapeHtml(p.district)}` : ''}
      ${p.subject ? ` · ${escapeHtml(p.subject)}` : ''}
      ${p.gradeLevel ? ` · ${escapeHtml(p.gradeLevel)}` : ''}
      <br>Evaluation Year: ${escapeHtml(p.evaluationYear)} · Generated ${escapeHtml(formatDate(new Date().toISOString()))}
    </p>
    <h1 style="margin-top:0">${escapeHtml(title)}</h1>
    <p class="meta">This report documents professional practice and evidence toward Accomplished performance on the OTES 2.0 Teacher Performance Evaluation Rubric.</p>
  `;
}

export function buildCategoryReportHtml(workspace: OtesWorkspace, categoryId: string) {
  const domain = OTES_RUBRIC.find(d => d.id === categoryId);
  const actions = workspace.actions.filter(a => a.categoryId === categoryId);

  const body = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
    <head><meta charset="utf-8"><title>${escapeHtml(domain?.name ?? 'OTES Report')}</title>
    <style>${reportStyles()}</style></head>
    <body>
      ${reportHeader(workspace, `${domain?.name ?? 'Category'} — Action Log Report`)}
      ${buildCategorySection(categoryId, actions)}
      <div class="footer">
        Prepared for administrator review · OTES 2.0 Teacher Performance Evaluation Rubric
      </div>
    </body></html>`;

  return body;
}

export function buildFullReportHtml(workspace: OtesWorkspace) {
  const sections = OTES_RUBRIC.map(domain => {
    const actions = workspace.actions.filter(a => a.categoryId === domain.id);
    return buildCategorySection(domain.id, actions);
  }).join('<hr style="margin:40px 0;border:none;border-top:2px solid #d8e2ec">');

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
    <head><meta charset="utf-8"><title>OTES 2.0 Action Log Report</title>
    <style>${reportStyles()}</style></head>
    <body>
      ${reportHeader(workspace, 'OTES 2.0 Action Log — All Domains')}
      ${sections}
      <div class="footer">
        Prepared for administrator review · OTES 2.0 Teacher Performance Evaluation Rubric
      </div>
    </body></html>`;
}

export function downloadWordReport(html: string, filename: string) {
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.doc') ? filename : `${filename}.doc`;
  link.click();
  URL.revokeObjectURL(url);
}
