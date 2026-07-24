# Career Safety Training

A Next.js training platform with course-code enrollment, interactive lessons,
saved learner progress, assessments, rosters, and completion certificates.

## Local setup

```bash
npm install
npm run db:init
npm run dev
```

Open `http://localhost:3000`. The SQLite database is stored at
`prisma/dev.db`. Running `npm run db:init` is safe to repeat and upgrades older
copies of the local training database without removing learner records.

Course definitions live under `data/courses/<course-folder>/module.json`.

## Administration

The administration area is available at `/admin/login`. After signing in, an
administrator can create learner course codes, view course rosters, edit
results, export CSV files, and remove records.

## Production database

Local SQLite is intended for local or single-server use. A serverless deployment
needs a persistent hosted database and the matching Prisma driver adapter.
