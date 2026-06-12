# Canvas Reports Pro Architecture

## Product Boundary

Canvas Reports Pro is a Canvas LMS reporting extension for instructors. It produces professional reports from Canvas data only. It does not create AI conclusions, student risk predictions, or inferred behavioral labels.

## Runtime Targets

### Chrome Extension

- Manifest V3 content script.
- Injects a **Reports** button beside the existing Canvas Message button when present.
- Uses Canvas same-origin authenticated API calls from the active Canvas session.
- Stores instructor notes and report preferences in `chrome.storage.local`.

### Tampermonkey

- Same UI and API layer can be packaged as an inline userscript bundle.
- Uses `localStorage` fallback for notes.
- MVP userscript file is scaffolded in `tampermonkey/CanvasReportsPro.user.js`.

## Folder Structure

```text
canvas-reports-pro/
  docs/
    ARCHITECTURE.md
    CANVAS_API_MAP.md
    MVP_PLAN.md
    NOTES_SCHEMA.md
    ROADMAP.md
  src/
    components/
      App.tsx
    content/
      content.tsx
    data/
      reportCatalog.ts
    reports/
      builders.ts
    services/
      canvasClient.ts
      notesStore.ts
    types/
      canvas.ts
      notes.ts
      reports.ts
    utils/
      exportCsv.ts
      exportPdf.ts
      format.ts
    styles.css
  manifest.chrome.json
  package.json
  vite.config.ts
```

## Data Flow

1. Instructor opens a Canvas course.
2. Content script detects `/courses/:courseId`.
3. Content script injects **Reports** in the Canvas toolbar.
4. React app opens as a full-screen reporting panel.
5. `CanvasClient` fetches course, students, enrollments, assignments, submissions, discussion topics, page views where available.
6. Report builders compute display-only metrics.
7. Reports render as printable HTML.
8. Export actions produce print, PDF, and CSV where appropriate.

## Core Services

- `CanvasClient`: paginated Canvas REST API access.
- `NotesStore`: local note, conference, and rules storage.
- `builders.ts`: deterministic report calculations.
- `exportCsv.ts`: CSV download helper.
- `exportPdf.ts`: printable-area PDF export using `html2canvas` and `jsPDF`.

## Initial Report Categories

- Student Reports
- Course Reports
- Engagement Reports
- Communication Reports
- Administrative Reports
- Utilities

## Design Principles

- Fast first load with parallel Canvas API calls.
- One report view equals one printable layout.
- No hidden scoring.
- No AI-generated recommendations.
- All derived values must be visible and explainable.
- Reports should degrade gracefully when Canvas permissions hide a field.

## Security and Privacy

- No external backend required for MVP.
- Notes are local to the browser profile unless Firebase support is explicitly enabled later.
- No student data is sent to third-party AI services.
- CSV/PDF exports are generated locally in the browser.
