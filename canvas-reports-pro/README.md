# Canvas Reports Pro

Canvas Reports Pro is a Chrome Extension and future Tampermonkey-compatible reporting layer for Canvas LMS. It adds a **Reports** button to Canvas course pages and generates professional, printable reports using Canvas API data only.

No AI conclusions, no predictive scoring, and no hidden risk model. Every report is data-backed, printable, and designed for export.

## MVP Reports

1. Student Snapshot Report
2. Student Conference Report
3. Course Health Report
4. Missing Work Report
5. Communication Timeline Report

## Development

```powershell
cd canvas-reports-pro
npm install
npm run build
```

Load the built extension from `canvas-reports-pro/dist` after copying or renaming `manifest.chrome.json` to `dist/manifest.json` as part of the packaging step.

## Key Docs

- [Architecture](docs/ARCHITECTURE.md)
- [Canvas API Map](docs/CANVAS_API_MAP.md)
- [MVP Plan](docs/MVP_PLAN.md)
- [Notes Schema](docs/NOTES_SCHEMA.md)
- [Roadmap](docs/ROADMAP.md)
