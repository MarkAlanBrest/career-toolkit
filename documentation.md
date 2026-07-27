# Server and Third-Party Services Inventory

Last repository audit: July 19, 2026

## 1. Purpose and scope

This document inventories the active code in the `career-toolkit` repository, the routes and files exposed by the deployed Next.js application, the data it stores, and the external services and libraries it uses.

The production URL referenced by the code is:

- `https://career-toolkit-ruby.vercel.app`

This is a source-code audit. It does **not** prove which environment variables, Vercel integrations, domains, retention policies, backups, or billing plans are currently configured in the Vercel dashboard. Those items must be confirmed separately in the relevant provider dashboards.

## 2. Hosting and application stack

| Component | Current use |
|---|---|
| Vercel | Hosts the Next.js application, static assets, and serverless API routes. |
| Next.js 15 | Application framework using the App Router. |
| React 18 | User-interface framework. |
| TypeScript | Primary application and API language. |
| Node.js runtime | Runs server-side route handlers and document parsing. |
| Vercel Blob | Durable private JSON storage for LG Room reservations, settings, and admin accounts. |
| Upstash Redis | Stores BrightPath learning profiles and generated lessons when configured. |

`vercel.json` gives `/api/generate` a 60-second maximum duration and `/api/parse-file` a 30-second maximum duration.

## 3. Active web pages

These routes are under `app/` and are included in the current production build.

| Route | Purpose |
|---|---|
| `/` | Canvas Enhancer marketing home page. |
| `/features` | Canvas Enhancer feature overview. |
| `/support` | Support and frequently asked questions. |
| `/privacy` | Privacy information for Canvas Enhancer. |
| `/grader` | Browser-based Canvas grading interface. It stores the entered Canvas URL, Canvas API token, and assignment criteria in that browser's `localStorage`. |
| `/canvas-app` | Canvas Student app instructions, App Store/Google Play links, QR codes, and printable/email-ready directions. |
| `/drive-profile` | Behavioral/work-style questionnaire and client-side PDF report generator. |
| `/learning` | BrightPath adaptive elementary lessons for two hard-coded student identifiers. |
| `/ppt-narrator` | Installation/instruction page for the PowerPoint Narrator userscript. |
| `/lga-room` | NCST-branded LG Room information and reservation landing page. |
| `/lga-room/calendar` | Public reservation calendar, request form, and admin controls. |

## 4. Active server API routes

| Route | Methods | Access | Purpose and data flow |
|---|---|---|---|
| `/api/components` | `GET`, `OPTIONS` | Public; CORS `*` | Returns the Canvas Content Studio component catalog from `lib/components.ts`. Cached publicly for one hour. |
| `/api/canvas` | `POST`, `OPTIONS` | Public; CORS `*` | Proxies requests to approved Canvas LMS hosts and `/api/v1/` paths. A Canvas bearer token supplied by the user passes through the server for that request. |
| `/api/generate` | `POST`, `OPTIONS` | Public; CORS `*` | Streams requests to Anthropic Messages API. Permits Claude Haiku 4.5, Claude Sonnet 4.6, and Anthropic's built-in web-search tool. No active authentication, rate limiting, or usage enforcement is present. |
| `/api/learning` | `GET`, `POST` | Public | Generates or retrieves a daily BrightPath lesson and records results in Redis. Only the identifiers `jenna` and `sophia` are accepted. Uses Claude Sonnet 4.6 when configured and a built-in fallback lesson otherwise. |
| `/api/parse-file` | `POST`, `OPTIONS` | Public; CORS `*` | Downloads or accepts a submitted file and extracts text from PDF, Word, RTF, HTML/text, and Excel formats. Used by grading/document workflows. |
| `/api/lga-room/reservations` | `GET`, `POST` | Public | Lists reservations, optionally by month, and accepts new requests. Data is stored in Vercel Blob. New requests can trigger Resend email. |
| `/api/lga-room/reservations/[id]` | `PATCH`, `DELETE` | LG admin credentials in request headers | Updates status/details, deletes reservations, checks conflicts, and sends decision/time-change/building/maintenance emails. |
| `/api/lga-room/admin` | `POST` | Public login check | Validates the LG master password or an email/password admin account. |
| `/api/lga-room/admin/accounts` | `GET`, `POST`, `DELETE` | LG admin credentials in request headers | Lists, creates, and removes LG admin accounts. Passwords are salted and hashed with Node `scrypt`. |
| `/api/lga-room/admin/settings` | `GET`, `PUT` | LG admin credentials in request headers | Reads service status and manages notification email addresses. |
| `/api/lga-room/admin/export` | `GET` | LG admin credentials in request headers | Exports reservation data as CSV. |

## 5. Publicly served static files

Everything under `public/` can be requested directly from the production domain.

### Installable scripts and extension assets

| Public file | Purpose |
|---|---|
| `/content-studio.user.js` | Canvas Content Studio Tampermonkey userscript. Calls this server for components and AI generation. |
| `/topic-builder.user.js` | Google Classroom Topic Builder userscript. Calls Anthropic directly with the user's API key and loads PDF.js/Mammoth from Cloudflare CDN. |
| `/classroom-grading-assistant.user.js` | Google Classroom grading userscript. Calls Anthropic directly with the user's API key and accesses Google Docs using the existing browser session. |
| `/canvas-enhancer.js` and `/canvas-enhancer.css` | Remotely hosted Canvas Enhancer script and styles. Changes can affect clients that load these files. |
| `/canvas-class-management-toolbars.zip` | Download package containing Scheduler, Grader, and Message toolbars. |
| `/class-management-download.html` | Download page for the toolbar ZIP. |
| `/components.json` | Static component data file. |

### Standalone pages and assets

| Public file | Purpose |
|---|---|
| `/libraryhub.html` | Static NCST digital-learning resource directory with links to third-party research, standards, safety, and education sites. |
| `/pa.html` | PA/Ohio Building Code Assistant interface. It currently calls `/api/code-chat`, but that API route is not present in the active repository. |
| `/google-oauth-callback.html` | OAuth popup callback that relays a Google access token from the URL fragment to the Google Classroom Topic Builder opener window. |
| `/ncst-logo.png` and `/ncst-campus.jpg` | NCST branding assets used by the LG Room page. Originally obtained from the official NCST website. |
| `/screenshots/*` | Canvas Enhancer marketing screenshots. |

The repository also contains multiple extension source/build directories outside `public/`. They are source and packaging material, but Next.js does not automatically serve them as URL paths: `ai-grader-extension/`, `extension/`, `extension-class-management-install/`, `extension-email/`, and `module-builder-extension/`.

## 6. Stored data and sensitive information

### Vercel Blob

The LG Room service stores three private JSON objects:

| Blob path | Contents |
|---|---|
| `lga-room/reservations.json` | Reservation dates/times, requester name, organization, email, phone, event name, purpose, number of people, setup requirements, special requests, status, and timestamps. This contains personal information. |
| `lga-room/settings.json` | Notification addresses and Microsoft 365 delegated connection data, including its refresh token. Stored as a private Blob; tokens are never returned by the settings API. |
| `lga-room/admins.json` | Lowercased admin email addresses, salted `scrypt` password hashes, and creation timestamps. |
| `lga-room/admin-sessions.json` | SHA-256 hashes of random eight-hour admin session tokens, administrator email addresses, and expiration times. |

### Upstash Redis

BrightPath uses these key patterns:

- `brightpath:{student}:profile`
- `brightpath:{student}:lesson:{YYYY-MM-DD}`

Profiles contain completed lesson IDs, assessment results, subject/skill performance, streaks, and last-completed dates. Lessons contain generated instructional content and questions.

If Redis environment variables are absent, `lib/redis.ts` falls back to `.next/cache/document-creator-redis.json`. That local file is useful for development but is not durable or reliable storage on Vercel serverless instances.

### Browser storage

| Feature | Browser-stored data |
|---|---|
| `/grader` | Canvas base URL, Canvas API token, and per-assignment grading criteria in `localStorage`. |
| LG Room calendar admin | Normal sessions use an eight-hour signed `HttpOnly`, `Secure`, `SameSite=Lax` cookie. Old `localStorage` credentials are migrated once and deleted. |
| Userscripts/extensions | Various settings, identifiers, API keys, and preferences in Tampermonkey/extension storage; review each distributed package separately before compliance sign-off. |

## 7. Active third-party services and external systems

| Provider/system | How it is used | Data sent |
|---|---|---|
| Vercel | Application hosting, serverless functions, deployment, and Blob storage. | Application requests, logs, runtime metadata, and stored LG Room data. |
| Anthropic | AI generation for `/api/generate` and BrightPath; some public userscripts also call Anthropic directly. | Prompts, messages, grading/course content, and generated-learning context. Direct-call userscripts send the user's API key to Anthropic, not this server. |
| Upstash | Redis storage for BrightPath lessons and performance profiles. | Student identifier, lesson content, completion history, and scores. |
| Microsoft Graph / Mailjet | Sends LG Room request, approval/denial, reschedule, building manager, and maintenance emails. Microsoft 365 connects through device-code sign-in with delegated `Mail.Send`; Mailjet remains a fallback only before Microsoft setup begins. | Recipient email addresses, reservation/event details, and Microsoft delegated OAuth tokens. |
| Canvas LMS / Instructure | The grader and Canvas tools call Canvas APIs. The server proxy restricts API hosts to `instructure.com`, `canvas.com`, and `canvaslms.com`. | User-supplied Canvas token and requested Canvas API data pass through `/api/canvas`. |
| Google Classroom and Google Docs | Host environment for the Classroom userscripts; the grading userscript uses the active browser session. | Classroom/Docs requests occur in the user's browser. |
| Google OAuth | The static callback page relays an OAuth access token to the Topic Builder popup opener. | OAuth token remains in the browser URL fragment and is posted to the opener window. |
| Cloudflare CDN (`cdnjs`) | Supplies browser builds of PDF.js and Mammoth to Topic Builder and some extension variants. | Standard asset requests, including IP/user-agent metadata. |
| Google Fonts | Supplies fonts to some pages; other pages use Next.js font handling. | Standard font asset requests where CSS `@import` or `<link>` is used. |
| QR Server (`api.qrserver.com`) | Generates QR-code images for Canvas Student App Store and Google Play URLs. | The app-store URL to encode, plus standard request metadata. |
| Apple App Store / Google Play | External destination links for the Canvas Student mobile app. | Standard link-navigation metadata. |
| Tampermonkey | Runs the distributed `.user.js` tools in supported browsers. | Depends on the installed userscript and its granted connections. |
| NCST official website | Source of the LG Room page logo/campus image and an outbound main-site link. | Standard link-navigation metadata. |

`libraryhub.html` contains outbound links to many research and standards resources (for example Google Scholar, CORE, DOAJ, OpenStax, OSHA, NIOSH/CDC, SAE, EPA, NHTSA, FMCSA, NFPA, and IEEE). These are links, not server-side API integrations.

## 8. Installed npm packages

### Runtime packages in active use

| Package | Use |
|---|---|
| `next`, `react`, `react-dom` | Web application framework and UI. |
| `@upstash/redis` | Redis client. |
| `@vercel/blob` | LG Room Blob storage. |
| `resend` | Transactional email. |
| `pdfjs-dist` | Primary server-side PDF text extraction. |
| `pdf-parse` | Fallback PDF text extraction. |
| `mammoth` | `.docx` conversion to structured HTML/text. |
| `word-extractor` | Legacy `.doc` extraction. |
| `rtf-parser` | RTF extraction. |
| `xlsx` | Excel workbook-to-text/CSV extraction. |
| `pdf-lib` | Client-side Drive Profile PDF generation. |

### Development packages

- `typescript`
- `@types/node`
- `@types/react`
- `@types/react-dom`

### Installed but not used by active application code

- `mysql2` is declared in `package.json`, but no active `app/` or `lib/` code imports it.

## 9. Environment variables

Never put secret values in this document or commit them to source control.

### Active application variables

| Variable | Secret? | Purpose |
|---|---:|---|
| `ANTHROPIC_API_KEY` | Yes | Server-side Anthropic requests. |
| `UPSTASH_REDIS_REST_URL` | Treat as sensitive | Upstash Redis endpoint. |
| `UPSTASH_REDIS_REST_TOKEN` | Yes | Upstash Redis token. |
| `KV_REST_API_URL` | Treat as sensitive | Alternate Vercel Marketplace name for the Redis endpoint. Not currently listed in `.env.example`. |
| `KV_REST_API_TOKEN` | Yes | Alternate Vercel Marketplace name for the Redis token. Not currently listed in `.env.example`. |
| `BLOB_READ_WRITE_TOKEN` | Yes | Vercel Blob access when token-based configuration is used. Vercel OIDC integration may also supply access. |
| `MAILJET_API_KEY` | Yes (fallback) | Mailjet API key, used as SMTP username when Microsoft 365 is not configured in LG Room Admin settings. |
| `MAILJET_SECRET_KEY` | Yes (fallback) | Mailjet secret key, used as SMTP password. |
| `MAILJET_FROM_EMAIL` | Yes (fallback) | Sender address — must be verified in Mailjet (Account > Sender addresses). |
| `MAILJET_FROM_NAME` | No | Optional display name shown as the sender. |
| `OUTLOOK_USER` | No, legacy fallback only | Address used by the legacy password-based SMTP path. School Microsoft 365 accounts should use the Graph settings in the Admin page. |
| `OUTLOOK_APP_PASSWORD` | No, legacy fallback only | Password for the legacy SMTP path; not recommended for Exchange Online. |
| `OUTLOOK_FROM_NAME` | No | Optional display name for the legacy fallback path. |
| `LGA_ROOM_ADMIN_PASSWORD` | Yes | Break-glass LG Room master password. |
| `NEXT_PUBLIC_APP_URL` | No | Public application base URL used in email links. |
| `NEXT_PUBLIC_EXTENSION_URL` | No | Extension installation URL used by marketing pages. It is referenced in code but missing from `.env.example`. |

### Present for disabled or legacy code

| Variable | Status |
|---|---|
| `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `SHAREPOINT_SITE_ID` | Microsoft Graph/SharePoint support exists in `lib/sharepoint.ts`, but its Document Creator API route is under `disabled/` and not deployed. |
| `ADMIN_TOKEN` | Used only by the disabled Document Creator super-admin route; missing from `.env.example`. |
| `UNSPLASH_ACCESS_KEY` | Used only by the disabled Document Creator Unsplash route; missing from `.env.example`. |
| `OWNER_KEY`, `SIGNUP_ADMIN_TOKEN` | Listed in `.env.example`, but no active code references them. |

## 10. Disabled, legacy, or inconsistent items

### Document Creator

The complete Document Creator UI and its API routes are under `disabled/app/`. They are intentionally excluded from the Next.js route tree to remain under Vercel's Hobby-plan function limit. The disabled feature includes authentication, teacher/school administration, usage tracking, document history, SharePoint upload, and Unsplash search.

### Microsoft Graph / SharePoint

`lib/sharepoint.ts` and the Azure environment-variable template remain in the active repository, but there is no active route importing the upload feature. Treat it as prepared but not deployed.

### Lemon Squeezy billing

`README.md` describes Lemon Squeezy subscriptions, licenses, monthly AI limits, and purchased credits. The active `app/` and `lib/` code contains no Lemon Squeezy SDK, API calls, webhook route, license validation, or usage-enforcement logic. The home page also says every tool is free. The README billing section should therefore be treated as stale until billing code is restored or the text is removed.

### PA/Ohio Building Code Assistant

`public/pa.html` expects `GET` and `POST /api/code-chat`. No active `app/api/code-chat/route.ts` exists, so the page cannot complete requests in the current deployment.

## 11. Security and compliance action register

These findings should be addressed before describing the system as production-hardened.

| Priority | Finding | Recommended action |
|---:|---|---|
| Critical | `getMasterPassword()` falls back to a known password when `LGA_ROOM_ADMIN_PASSWORD` is absent. | Remove the fallback and fail closed when the variable is missing. Rotate the production password. |
| Critical | Public `GET /api/lga-room/reservations` returns complete reservation objects, including names, emails, phone numbers, purposes, and special requests. | Return only redacted calendar fields publicly. Add a separate authenticated admin-detail endpoint. |
| High | `/api/generate` is a public, wildcard-CORS Anthropic proxy with no authentication, rate limiting, quota, or active billing enforcement. | Require signed client authentication and add per-account/IP limits, abuse monitoring, and cost controls. |
| High | A default Unsplash API key is hard-coded in `module-builder-extension/module-builder.js` and a related text source. | Rotate/revoke the key, remove it from source/history where practical, and use user-supplied or server-managed credentials. |
| High | `/api/parse-file` accepts a caller-provided URL and the server fetches it without a general host allowlist. | Add an allowlist or signed-URL policy, block private/link-local IP ranges and redirects, and enforce download/body size limits to reduce SSRF and resource-exhaustion risk. |
| Medium | `/api/learning` is public and exposes named student profiles by two predictable identifiers. | Add authentication/authorization or replace names with non-identifying IDs and restrict profile access. |
| Medium | Several APIs use wildcard CORS. | Restrict allowed origins to the actual extension IDs/domains and production application where possible. |
| Medium | The Redis file fallback is not durable on Vercel. | Require Redis in production and expose a health check that fails when persistent storage is absent. |
| Medium | No explicit retention/deletion policy is implemented for reservations, emails, generated lessons, or learning results. | Define retention periods, deletion procedures, backup ownership, and data-subject handling. |
| Medium | README billing claims do not match the active server. | Update documentation or restore the missing enforcement before relying on those claims. |
| Low | `mysql2`, `OWNER_KEY`, and `SIGNUP_ADMIN_TOKEN` appear unused. | Remove them after confirming they are not needed by an external deployment process. |
| Low | `/pa.html` is exposed while its backend is missing. | Restore `/api/code-chat` or remove/disable the public page. |

## 12. Dashboard verification checklist

Complete this portion manually because it cannot be proven from the repository alone:

- [ ] Confirm the Vercel project owner, plan, production domains, and deployment regions.
- [ ] Export a list of configured environment-variable **names** for Production, Preview, and Development. Do not copy secret values into documentation.
- [ ] Confirm Vercel Blob store name, access controls, backup/export procedure, and retention.
- [ ] Confirm Upstash database name, region, TLS/access policy, retention, and backup plan.
- [ ] Confirm Anthropic account owner, spending limits, model access, logging/privacy settings, and key-rotation date.
- [ ] Confirm Resend account owner, verified sending domain, recipient restrictions, and key-rotation date.
- [ ] Confirm whether Vercel request/function logs contain Canvas tokens, reservation personal data, prompts, or uploaded-file URLs.
- [ ] Inventory all production domains and DNS providers.
- [ ] Record the repository host, deployment integration, branch protection, and who can deploy.
- [ ] Record incident-response contacts and the process for revoking every production key.
- [ ] Confirm the NCST logo/campus-image usage is authorized and record the asset owner/source.
- [ ] Review the privacy page against the actual current data flows described in this document.

## 13. Suggested maintenance cadence

- Review this inventory after every new API, storage provider, authentication change, or public userscript release.
- Review dependencies and provider access quarterly.
- Rotate sensitive credentials on a documented schedule and immediately after suspected exposure.
- Re-run the route, environment-variable, external-URL, and package audit before each formal compliance or security review.
