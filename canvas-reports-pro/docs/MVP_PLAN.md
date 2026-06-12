# MVP Implementation Plan

## Phase 1: Foundation

- Build standalone React + TypeScript + Tailwind extension project.
- Inject **Reports** button into Canvas course toolbar.
- Use same-origin Canvas REST API calls.
- Load course, students, enrollments, and submissions in parallel.
- Add printable report shell.
- Add PDF export and CSV export.

Status: scaffolded.

## Phase 2: Priority Reports

1. Student Snapshot Report
   - Current grade.
   - Missing and late assignments.
   - Last course activity.
   - Submission rate.
   - Notes section.

2. Student Conference Report
   - Student snapshot.
   - Missing work.
   - Submission history.
   - Instructor notes.
   - Action plan and follow-up date sections.

3. Course Health Report
   - Course average.
   - High and low grades.
   - Missing and late counts.
   - Inactive students.
   - Grade distribution chart.

4. Missing Work Report
   - Student.
   - Assignment.
   - Due date.
   - Days overdue.
   - CSV export.

5. Communication Timeline Report
   - Submission comments first.
   - Local notes second.
   - Conversations later where Canvas permits.

## Phase 3: Utilities

- Instructor Notes System.
- Student Case File.
- Rule-based Early Alerts.
- Saved report templates.

## Phase 4: Distribution

- Chrome Extension packaging.
- Tampermonkey bundle.
- Optional Firebase sync for notes.

## Five-Second Goal

For typical course sizes:

- Fetch course, students, enrollments, submissions in parallel.
- Cache loaded course data for the panel session.
- Avoid per-student calls in default reports.
- Only call page views or deeper APIs when a specific report requires them.
