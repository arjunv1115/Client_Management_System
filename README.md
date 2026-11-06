# PixelForge Client OS

A complete, runnable client management system for agencies, studios and freelancers: React + Tailwind dashboard, Express REST API, role-based access, a client portal, finance ledger, AI workspace and a Supabase-ready SQL schema.

The demo is **local-first**. It runs immediately with a seeded JSON database, then optionally connects to Razorpay, Google Calendar/Meet, an OpenAI-compatible AI provider and Supabase in production.

---

## Quick start

Requirements: **Node.js 18+** (tested on Node 26) and npm.

```bash
cd client-management-system
npm run setup     # installs root, server and client dependencies
npm run dev       # starts API on :5000 and Vite on :5173
```

Open **http://localhost:5173**.

If dependencies are already installed:

```bash
npm run dev
```

Useful commands:

| Command | What it does |
| --- | --- |
| `npm run dev` | API + web app together |
| `npm run dev:server` | API only (`http://localhost:5000`) |
| `npm run dev:client` | Vite only (`http://localhost:5173`) |
| `npm run seed` | Reset the local demo database to a fresh state |
| `npm run build` | Production build of the React app |
| `npm start` | Serve the API and the built client on `:5000` |

`npm start` expects `client/dist` to exist, so run `npm run build` first.

---

## Demo accounts

| Role | Email | Password | Opens |
| --- | --- | --- | --- |
| Super Admin | `superadmin@cms.dev` | `Admin@123` | Full workspace, organizations, all admin tools |
| Admin | `admin@cms.dev` | `Admin@123` | Admin console, billing, payroll, team, public page |
| Manager | `manager@cms.dev` | `Manager@123` | Leads, clients, projects, finance, referrals |
| Team Member | `member@cms.dev` | `Member@123` | Delivery work: projects, tasks, meetings, messages, documents |
| Client | `client@cms.dev` | `Client@123` | Client portal for Acme Studios |

Use **`/login`** for normal users and **`/admin/login`** for the restricted administrator door. The admin door rejects non-admin roles. The login pages include one-click demo-account fill buttons.

> Roles are checked by the Express API on every request. The UI hides actions a role cannot perform, but the server is the source of truth.

---

## What is implemented

### Staff workspace

- **Dashboard** — revenue/lead/project KPIs, range selector, charts, recent activity, tasks, notifications.
- **Leads** — searchable and filterable table, detail pages, create/edit/delete, activity notes, AI lead scoring and follow-up drafting, sales pipeline board.
- **Clients** — CRM records, linked projects/payments/meetings/tasks, client detail pages, AI client summary.
- **Projects** — budgets, progress, team, deadlines, linked tasks/documents/payments, AI project insights.
- **Tasks** — kanban board plus list view, drag-and-drop columns (native HTML5), subtasks, comments, priorities, due dates.
- **Meetings** — CRUD, detail drawer, AI agenda and meeting summary, optional Google Calendar/Meet event creation.
- **Messages** — agency conversations, realtime-style polling, unread counts, typing presence, attachments.
- **Documents** — library grid/list, upload, sharing with clients, AI document summary, quotations (manual + AI builder with approval), contracts.
- **Finance** — revenue analytics, payments, expenses, transactions ledger, retainers, payroll. Payments and expenses post idempotently to the ledger.
- **Billing** — plan usage, invoices, billing history, demo activation, optional Razorpay Checkout.
- **Team** — team directory with utilization/roles, admin-only writes.
- **Public page** — public business page builder and public lead capture at `/p/:slug`.
- **Referrals** — referral codes, referred companies, rewards.
- **Plans & pricing** — plan comparison and demo plan activation.
- **Settings** — profile and avatar, organization, appearance (light/dark/system, density), notifications, security/password, integrations, data export.
- **Admin console** — overview charts, users, invitations, role/permission matrix, AI feature switches, audit log, activity log, organizations (Super Admin).
- **Help & AI** — support tickets and a business assistant grounded in actual workspace data.

### Client portal

- Overview, projects, shared documents, invoices, announcements and meetings.
- Scoped server-side to the logged-in client. A client cannot request another client's data even by changing a URL or API query.
- Clients can message the agency and open support tickets, but cannot read the internal ledger, payroll or other clients.

### Cross-cutting

- JWT auth, bcrypt password hashing, server-side role guards.
- Resource API with search, filters, sorting, pagination, soft delete/restore, CSV/JSON export, audit logs and notifications.
- React Query caching and invalidation, loading/empty/error states.
- Responsive sidebar and mobile drawer, command palette (`Ctrl/Cmd + K`), global search.
- Light, dark and system themes persisted per user.
- Toast feedback, confirm dialogs, accessible labels and focus states.
- CSV/JSON exports on list pages and in Settings.

---

## Tech stack

**Frontend:** React 18, Vite, Tailwind CSS, React Router DOM, TanStack React Query, React Hook Form, Recharts, Lucide React, Sonner, Axios.

**Backend:** Node.js, Express, JWT, bcryptjs, Helmet, CORS, Morgan, express-rate-limit, Multer, Zod-style validation helpers, JSON-file persistence.

**Production data layer:** Supabase/PostgreSQL schema, RLS policies, helper functions and seed SQL in [`database/`](./database).

---

## Project structure

```text
client-management-system/
├── client/                  React app
│   ├── src/
│   │   ├── components/      UI kit, layout, tables, forms, charts, AI chat
│   │   ├── contexts/        Auth and theme providers
│   │   ├── hooks/           Small shared hooks
│   │   ├── lib/             API client, React Query hooks, utilities
│   │   └── pages/           Every module, route and the client portal
│   └── .env.example
├── server/                  Express API
│   ├── src/
│   │   ├── config/          Resource registry and role definitions
│   │   ├── db/              JSON store and demo seed
│   │   ├── middleware/      Auth, error handling
│   │   ├── routes/          Auth, resources, dashboard, AI, admin, billing…
│   │   ├── services/        Ledger, analytics, AI, organization logic
│   │   └── utils/           Query parsing, audit, plan limits
│   ├── data/db.json         Local demo database (created by npm run seed)
│   └── uploads/             Local file uploads
├── database/                Supabase SQL
│   ├── schema.sql           Tables + indexes, RLS enabled
│   ├── functions.sql        Helpers, triggers, reporting views, search RPC
│   ├── policies.sql         Row Level Security policies
│   └── seed.sql             Demo data mirroring the local database
├── .env.example             All server/client environment variables
└── package.json             Root scripts
```

---

## Configuration

The app works with **no `.env` file at all**. To configure optional services, copy `.env.example` to `server/.env` and fill in only what you need. Copy `client/.env.example` to `client/.env` only if the API is not on the default local URL.

### AI

```env
AI_API_KEY=
AI_API_BASE_URL=https://api.openai.com/v1
AI_MODEL=gpt-4o-mini
```

- **With a key:** chat, scoring, summaries, insights, quotation drafting and reports call an OpenAI-compatible chat-completions endpoint.
- **Without a key:** the same endpoints use a deterministic local rules engine that reads real leads, projects, payments, tasks and meetings. It still produces useful, data-grounded output and labels the provider as `rules`.
- AI output is **advisory**. AI quotation save requires an explicit approval flag, and suggestions are not auto-applied.

### Razorpay

```env
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
```

- **Configured:** Billing loads Razorpay Checkout, verifies signatures server-side and records subscription payments. The webhook endpoint verifies `X-Razorpay-Signature`.
- **Not configured:** plan changes use demo activation and the UI says so. Nothing is charged.

### Google Calendar / Meet

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:5000/api/integrations/google/callback
```

- **Configured:** Settings can start a real Google OAuth flow and meetings can create a Calendar event with a Meet link.
- **Not configured:** the integration card shows "not configured", and meeting AI still works without creating an external event.

### Email

```env
EMAIL_SERVICE_API_KEY=
EMAIL_FROM=no-reply@yourdomain.com
```

- **Configured:** password-reset delivery can use the email provider hook.
- **Not configured:** reset links are returned/shown in development for the demo.

### Supabase

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_ANON_KEY=
```

Supabase credentials let the backend report integration status and are reserved for a production data adapter. **The running demo uses `server/data/db.json`, not Supabase.** See the next section.

---

## Supabase production database

`database/` contains a complete PostgreSQL schema matching the demo data model, plus RLS and convenience views. The runtime is intentionally not wired to it so the project runs without cloud credentials.

1. Create a Supabase project.
2. Open the SQL editor and run the files **in order**:
   1. `database/schema.sql` — 71 tables, indexes, RLS enabled.
   2. `database/functions.sql` — identity helpers, `updated_at` trigger, signup hook, dashboard/finance/portal views, `search_workspace()`, invoice numbering.
   3. `database/policies.sql` — staff, manager, admin and client-scoped RLS.
   4. `database/seed.sql` — optional demo data.
3. Create Auth users. The `handle_new_user()` trigger creates a matching `public.profiles` row. Pass `org_id`, `role` and (for clients) `client_id` in `raw_user_meta_data`, or update the profile afterwards.
4. Keep the **service role key server-side only**. Never expose it through `VITE_*` variables.
5. To migrate the Express data layer, replace `server/src/db/store.js` with a Supabase repository and keep the existing route contracts. The UI is already API-shaped and does not need to change.

Security model in SQL:

- `current_org_id()`, `current_role_name()`, `current_client_id()` resolve the signed-in profile.
- Staff read their own organization; managers write sales/finance; admins own payroll, billing, referrals, public pages and audit logs.
- Clients only see their own `client_id` records, shared documents, published announcements, their conversations and their own support tickets.
- `reset_tokens` has RLS enabled with no client policy; only the service role can touch it.

> The seed includes bcrypt demo password hashes for local parity. For real Supabase Auth, create users through Supabase Auth; do not copy `password_hash` into production auth.

---

## Roles

| Capability | Super Admin | Admin | Manager | Team Member | Client |
| --- | --- | --- | --- | --- | --- |
| Dashboard / delivery modules | ✅ | ✅ | ✅ | ✅ | Portal only |
| Leads, clients, projects | ✅ | ✅ | ✅ | read | own records |
| Payments, expenses, ledger, retainers | ✅ | ✅ | ✅ | — | own invoices |
| Payroll, billing, team writes | ✅ | ✅ | — | — | — |
| Public page, referrals | ✅ | ✅ | referrals read | — | — |
| Admin console | ✅ | ✅ | — | — | — |
| AI workspace / assistant | ✅ | ✅ | ✅ | ✅ | Help assistant |
| Client portal | — | — | — | — | ✅ |

The detailed permission codes live in `server/src/config/roles.js`, `server/src/config/resources.js` and the Admin → Roles tab.

---

## API overview

Base URL: `http://localhost:5000/api`.

- Success: `{ "success": true, "data": ..., "pagination"?: ..., "unread"?: ... }`
- Error: `{ "success": false, "message": "...", "details"?: ... }`
- Auth: Bearer JWT from `POST /auth/login` or `POST /auth/admin/login`.

Key route groups:

| Group | Examples |
| --- | --- |
| Auth | `/auth/login`, `/auth/admin/login`, `/auth/register`, `/auth/me`, `/auth/profile`, `/auth/password`, `/auth/forgot-password`, `/auth/reset-password` |
| Resources | `/leads`, `/clients`, `/projects`, `/tasks`, `/meetings`, `/documents`, `/payments`, `/expenses`, `/transactions`, `/retainers`, `/payroll`, `/quotations`, `/contracts`, `/referrals` |
| Dashboard | `/dashboard/summary`, `/dashboard/revenue`, `/dashboard/activity` |
| AI | `/ai/chat`, `/ai/leads/:id/score`, `/ai/leads/:id/follow-up`, `/ai/clients/:id/summary`, `/ai/projects/:id/insights`, `/ai/meetings/:id/agenda`, `/ai/meetings/:id/summarize`, `/ai/financial-insights`, `/ai/report`, `/ai/quotation`, `/ai/natural-search`, `/ai/data-quality` |
| Messages | `/messages/conversations`, `/messages/messages`, `/messages/conversations/:id/read`, `/messages/presence/ping` |
| Portal | `/portal/dashboard` |
| Admin | `/admin/dashboard`, `/admin/users`, `/admin/invitations`, `/admin/roles`, `/admin/ai-settings`, `/admin/audit-logs`, `/admin/organizations` |
| Billing | `/billing/overview`, `/billing/plans`, `/billing/subscribe`, `/billing/razorpay/verify`, `/billing/razorpay/webhook` |
| Public | `/public/pages/:slug`, `/public/pages/:slug/contact`, `/public/plans` |
| Settings | `/preferences`, `/preferences/theme`, `/integrations`, `/integrations/google/connect` |

Generic resource query parameters: `page`, `limit`, `sort` (`-field` for descending), `q`, `trash`, and filters such as `status=active`, `stage__in=a,b`, `amount__gte=1000`, `name__contains=acme`, `deleted_at__null=true`.

Full resource definitions and permissions are in `server/src/config/resources.js`.

---

## Data and reset

- Local data lives in `server/data/db.json`.
- Uploaded files live in `server/uploads/`.
- `npm run seed` rebuilds the demo data. Uploaded files remain on disk.
- The seed is deterministic in content but uses current dates so dashboards and overdue states always look realistic.

---

## Security notes

- JWT secrets, AI keys, Razorpay secrets, Google secrets and the Supabase service role key belong in `server/.env`, never in the client.
- The demo ships with a development JWT fallback. Set a long random `JWT_SECRET` before exposing the app.
- Helmet, CORS allow-listing, rate limits, bcrypt hashing, request validation and server-side authorization are enabled.
- Uploads are size-limited (10 MB) and type-checked. Review and add virus scanning before public production use.
- AI is advisory and requires human approval for quotation saves. Review generated content before sending it to clients.

---

## Honest status of optional integrations

| Integration | Status in this repo | What happens without credentials |
| --- | --- | --- |
| Local demo database | ✅ Fully working | Seeded JSON data, all CRUD works |
| JWT auth + roles | ✅ Fully working | Demo users work out of the box |
| AI assistant | ✅ Working with either provider | Deterministic local rules engine |
| Razorpay | ⚠️ Code path implemented, needs live keys to charge | Demo plan activation, clearly labelled |
| Google Calendar/Meet | ⚠️ OAuth flow and event API implemented, needs Google app credentials | Meetings work locally; no external event |
| Email delivery | ⚠️ Provider hook present, needs an email API key | Reset link shown in development |
| Supabase | ⚠️ Schema/RLS/seed provided; runtime still uses JSON | Local JSON store |
| Realtime | ⚠️ UI polls; Supabase Realtime not wired | Polling keeps conversations fresh |
| Object storage | ⚠️ Local disk uploads | Files served from `server/uploads` |

No optional service is faked silently. The UI and API responses indicate when demo fallbacks are active.

---

## Production checklist

1. Set `JWT_SECRET`, `CLIENT_URL` and `NODE_ENV=production`.
2. Run the Supabase SQL files and migrate `server/src/db/store.js` to a repository backed by Supabase.
3. Move uploads to Supabase Storage (or S3) and add malware scanning.
4. Configure Razorpay, Google OAuth, email and AI keys; turn on webhook signature checks.
5. Add backups, monitoring, structured logs and error reporting.
6. Review RLS policies with real seeded users before exposing the database directly to clients.
7. Run `npm run build` and serve the client behind HTTPS.

---

Built as a complete demo project. Everything labelled "optional" above degrades gracefully rather than breaking the app.
