import type { CanvasAssignment, CanvasCourse, CanvasEnrollment, CanvasSubmission, CanvasUser } from '../types/canvas';
import type { AssignmentAnalyticsRow, CourseHealthMetrics, MissingWorkRow, StudentMetrics } from '../types/reports';

export function buildStudentMetrics(
  student: CanvasUser,
  enrollments: CanvasEnrollment[],
  submissions: CanvasSubmission[],
  discussionParticipation = 0,
): StudentMetrics {
  const studentSubmissions = submissions.filter(submission => submission.user_id === student.id);
  const gradable = studentSubmissions.filter(submission => submission.assignment?.published !== false);
  const submitted = gradable.filter(submission => !!submission.submitted_at || submission.workflow_state === 'submitted' || submission.workflow_state === 'graded');
  const enrollment = enrollments.find(item => item.user_id === student.id);

  return {
    student,
    enrollment,
    currentGrade: enrollment?.grades?.current_grade || gradeFromScore(enrollment?.grades?.current_score),
    currentScore: enrollment?.grades?.current_score ?? null,
    missingCount: gradable.filter(submission => submission.missing || submission.late_policy_status === 'missing').length,
    lateCount: gradable.filter(submission => submission.late || submission.late_policy_status === 'late').length,
    submissionRate: gradable.length ? Math.round((submitted.length / gradable.length) * 100) : 0,
    discussionParticipation,
    lastLogin: student.last_login || null,
    lastCourseActivity: enrollment?.last_activity_at || null,
    submissions: studentSubmissions,
  };
}

export function buildCourseHealth(course: CanvasCourse, enrollments: CanvasEnrollment[], submissions: CanvasSubmission[]): CourseHealthMetrics {
  const scores = enrollments
    .map(enrollment => enrollment.grades?.current_score)
    .filter((score): score is number => typeof score === 'number');

  return {
    courseName: course.name,
    studentCount: enrollments.length,
    courseAverage: average(scores),
    highestGrade: scores.length ? Math.max(...scores) : null,
    lowestGrade: scores.length ? Math.min(...scores) : null,
    missingAssignmentCount: submissions.filter(submission => submission.missing || submission.late_policy_status === 'missing').length,
    lateAssignmentCount: submissions.filter(submission => submission.late || submission.late_policy_status === 'late').length,
    inactiveStudentCount: enrollments.filter(enrollment => daysSince(enrollment.last_activity_at) !== null && Number(daysSince(enrollment.last_activity_at)) >= 7).length,
    gradeDistribution: [
      { label: 'A', count: scores.filter(score => score >= 90).length },
      { label: 'B', count: scores.filter(score => score >= 80 && score < 90).length },
      { label: 'C', count: scores.filter(score => score >= 70 && score < 80).length },
      { label: 'D', count: scores.filter(score => score >= 60 && score < 70).length },
      { label: 'F', count: scores.filter(score => score < 60).length },
    ],
  };
}

export function buildMissingWorkRows(students: CanvasUser[], submissions: CanvasSubmission[]): MissingWorkRow[] {
  const studentMap = new Map(students.map(student => [student.id, student]));
  return submissions
    .filter(submission => submission.missing || submission.late_policy_status === 'missing')
    .map(submission => {
      const student = studentMap.get(submission.user_id);
      const dueDate = submission.assignment?.due_at || null;
      return {
        studentName: student?.name || `Student ${submission.user_id}`,
        studentId: submission.user_id,
        assignmentName: submission.assignment?.name || `Assignment ${submission.assignment_id}`,
        assignmentId: submission.assignment_id,
        dueDate,
        daysOverdue: daysSince(dueDate),
      };
    })
    .sort((a, b) => (b.daysOverdue || 0) - (a.daysOverdue || 0));
}

export function buildAssignmentAnalytics(assignments: CanvasAssignment[], submissions: CanvasSubmission[]): AssignmentAnalyticsRow[] {
  return assignments.map(assignment => {
    const rows = submissions.filter(submission => submission.assignment_id === assignment.id);
    const scores = rows.map(row => row.score).filter((score): score is number => typeof score === 'number');
    const submitted = rows.filter(row => row.submitted_at || row.workflow_state === 'submitted' || row.workflow_state === 'graded').length;
    const missing = rows.filter(row => row.missing || row.late_policy_status === 'missing').length;

    return {
      assignment,
      average: average(scores),
      median: median(scores),
      high: scores.length ? Math.max(...scores) : null,
      low: scores.length ? Math.min(...scores) : null,
      completionPercent: rows.length ? Math.round((submitted / rows.length) * 100) : 0,
      missingPercent: rows.length ? Math.round((missing / rows.length) * 100) : 0,
    };
  });
}

export function daysSince(date: string | null | undefined): number | null {
  if (!date) return null;
  const value = new Date(date).getTime();
  if (Number.isNaN(value)) return null;
  return Math.max(0, Math.floor((Date.now() - value) / 86400000));
}

function average(values: number[]): number | null {
  if (!values.length) return null;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 10) / 10;
}

function gradeFromScore(score?: number | null): string {
  if (typeof score !== 'number') return 'N/A';
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}
