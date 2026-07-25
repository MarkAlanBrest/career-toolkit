# Career Safety Training

A Next.js training platform with course-code enrollment, interactive lessons,
saved learner progress, assessments, rosters, and completion certificates.

## Local setup

```bash
npm install
npm run db:init
npm run dev
```

Copy `.env.example` to `.env`, replace its placeholder with the Neon PostgreSQL
connection string, and then open `http://localhost:3000`. Running
`npm run db:init` synchronizes the training schema to the configured database.

Course definitions live under `data/courses/<course-folder>/module.json`.

## AI-generated lessons

Training Studio is available at `/admin/courses`. Create a course by uploading one
PDF for each section. The backend stores the source PDF in PostgreSQL and uses
the OpenAI Responses API to create a source-grounded lesson plan with teaching
moments, questions, scenarios, and references to useful PDF pages.

Add `OPENAI_API_KEY` to `.env` to enable lesson generation and live student
questions. The same key enables natural instructor narration through the speech
endpoint. The classroom preview at `/training/demo` works without an API key and
falls back to the device voice when natural audio is unavailable.

## Administration

The administration area is available at `/admin/login`. After signing in, an
administrator can create learner course codes, view course rosters, edit
results, export CSV files, and remove records.

## Database

The application uses Neon PostgreSQL through Prisma's serverless Neon adapter.
The same database can be used for local development and a Vercel deployment.
