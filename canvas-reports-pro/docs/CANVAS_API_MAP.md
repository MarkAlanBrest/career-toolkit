# Canvas API Map

This project uses Canvas REST API data from the instructor's active Canvas session.

Primary official references:

- Submissions API: https://canvas.instructure.com/doc/api/submissions.html
- Users API: https://canvas.instructure.com/doc/api/users.html
- Analytics API: https://canvas.instructure.com/doc/api/analytics.html
- Conversations API: https://canvas.instructure.com/doc/api/conversations.html

## Shared Calls

| Data | Endpoint | Used By |
| --- | --- | --- |
| Course | `GET /api/v1/courses/:course_id?include[]=term` | All reports |
| Students | `GET /api/v1/courses/:course_id/users?enrollment_type[]=student&include[]=email&include[]=enrollments` | Student search, all student reports |
| Enrollments | `GET /api/v1/courses/:course_id/enrollments?type[]=StudentEnrollment&state[]=active&include[]=grades&include[]=user` | Grades, last activity, course health |
| Assignments | `GET /api/v1/courses/:course_id/assignments?bucket=all&order_by=due_at` | Assignment analytics, missing work |
| Submissions | `GET /api/v1/courses/:course_id/students/submissions?student_ids[]=all&include[]=assignment&include[]=submission_comments&include[]=rubric_assessment&include[]=read_status` | Snapshot, missing, late, grade documentation, feedback |

## Report-Specific Mapping

### Student Snapshot

- Student name: users endpoint.
- Current grade: enrollments with `include[]=grades`.
- Missing and late assignment counts: submissions `missing`, `late`, `late_policy_status`.
- Last course activity: enrollment `last_activity_at`.
- Last login: user field when exposed by Canvas permissions.
- Submission rate: computed from submissions.
- Discussion participation: phase 2 from discussion entries.
- Instructor notes: local notes store.

### Student Conference

Uses Student Snapshot data plus printable sections:

- Instructor notes.
- Action plan.
- Follow-up date.

### Grade Documentation

Uses submissions with:

- `assignment.name`
- `assignment.due_at`
- `submitted_at`
- `grade` / `score`
- `submission_comments`
- `missing`
- `late`

### Course Health

Uses enrollments and submissions:

- Course average, highest, lowest from enrollment grades.
- Missing and late counts from submissions.
- Inactive students from enrollment `last_activity_at`.
- Grade distribution computed from current scores.

### Missing Work

Uses submissions where:

- `missing === true`, or
- `late_policy_status === "missing"`.

### No Login

MVP uses enrollment `last_activity_at`. Future version can add user page views when permitted:

- `GET /api/v1/users/:user_id/page_views`

### Communication Timeline

MVP uses submission comments from submissions. Later phases can add:

- Conversations API where permissions and Canvas constraints allow it.
- Announcements/discussions mentioning a student.
- Local instructor notes.

## Permission Reality

Canvas permissions vary by institution. Some fields, especially login history and page views, may be unavailable to ordinary instructors. Reports must clearly show "Not available" rather than fabricating or inferring values.
