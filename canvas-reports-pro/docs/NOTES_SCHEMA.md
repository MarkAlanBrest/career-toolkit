# Notes Schema

MVP notes are stored locally in `chrome.storage.local` using key `crp_notes_v1`.

## Store Shape

```ts
type StoreShape = {
  notes: InstructorNote[];
  conferences: ConferenceRecord[];
  rules: EarlyAlertRule[];
};
```

## Instructor Notes

```ts
type InstructorNote = {
  id: string;
  courseId: string;
  studentId: string;
  studentName: string;
  body: string;
  tags: string[];
  followUpDate?: string;
  createdAt: string;
  updatedAt: string;
};
```

Indexes needed if moved to Firebase:

- `courseId`
- `studentId`
- `createdAt`
- `tags[]`

## Conference Records

```ts
type ConferenceRecord = {
  id: string;
  courseId: string;
  studentId: string;
  studentName: string;
  summary: string;
  actionPlan: string;
  followUpDate?: string;
  createdAt: string;
};
```

## Early Alert Rules

Rules are deterministic thresholds only.

```ts
type EarlyAlertRule = {
  id: string;
  courseId: string;
  label: string;
  enabled: boolean;
  field: 'currentScore' | 'missingCount' | 'lateCount' | 'daysSinceLastActivity';
  operator: '<' | '<=' | '>' | '>=';
  threshold: number;
};
```

Example rules:

- Current score below 70.
- Missing assignments above 2.
- No activity for 7 days.

No AI-driven predictions are stored or computed.
