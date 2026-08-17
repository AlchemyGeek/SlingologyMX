# SlingologyMX

Aircraft maintenance tracking and compliance management system for experimental aircraft owners.

**Current version:** v26.08.01  
**Public preview:** https://slingologymx.lovable.app  
**Self-host source:** https://github.com/AlchemyGeek/SlingologyMX

---

## What SlingologyMX Is

SlingologyMX is a lightweight, owner-centric web application for tracking aircraft maintenance, compliance, and operational planning. It is designed primarily for individual aircraft owners and builders—especially those operating Experimental/Amateur-Built aircraft—who want better visibility and planning tools without surrendering control of their data.

The project is intentionally simple, transparent, and extensible. It does **not** attempt to replace paper logbooks or scanned records. Instead, it acts as a digital command center layered on top of your existing records.

---

## Core Design Principles

- **Owner-first**: Built for individual aircraft owners, not fleets.
- **Paper remains the source of truth**: The system tracks metadata and planning signals, not logbook prose.
- **Your data stays yours**: Exportable at any time; no lock-in.
- **Lightweight by design**: Focused on clarity, not feature bloat.
- **Early-adopter mindset**: Evolving based on real-world use and feedback.

---

## Key Functional Areas

### 1. Maintenance Records

The maintenance log captures structured metadata for maintenance actions without duplicating logbook text.

Each record can include:

- Date of work
- Aircraft total time (TTAF)
- Engine / propeller time (as applicable)
- Category (airframe, engine, propeller, avionics, etc.)
- Reference to scanned logbook entries or documents
- Freeform notes for owner context
- Breakdown of costs into labor, parts, and other line items
- Automatic generation of linked financial transactions

Records can be created, edited, deleted, and exported.

---

### 2. Directives & Compliance Tracking

The Directives system tracks regulatory and manufacturer-driven requirements, including:

- Airworthiness Directives (FAA, EASA where applicable)
- Manufacturer Service Bulletins
- Service Letters and mandatory inspections

Each directive includes:

- Applicability and category
- Severity and compliance type
- Trigger method (time, cycles, calendar, one-time, mixed)
- Current status (Open, Compliant, Completed, Not Applicable, Resolved)
- Optional linkage to maintenance records and equipment
- Compliance event history centralized in `maintenance_directive_compliance`

This allows owners to plan compliance without embedding compliance logic into log entries themselves.

---

### 3. Counters & Time-Based Tracking

SlingologyMX supports counter-based tracking for items such as:

- Hobbs time
- Tach time
- Airframe total time
- Engine total time
- Propeller total time
- Oil changes
- Condition inspections
- Other recurring events

Counters can be:

- Linked to Hobbs/Tach for automatic derivation
- Manually maintained
- Reset/overhauled for engine or prop replacements
- Updated in batch through the "Edit All Counters" dialog
- Pushed from external apps via the integration API

Counter history tracks every change, supports reverting, and enforces chronological consistency.

Counters drive notifications and visualization rather than enforcing workflow. Owners remain responsible for determining when work is actually performed.

---

### 4. Notification System

The notification engine provides advance awareness of upcoming events, including:

- Time-based thresholds
- Calendar-based expirations
- Counter-driven limits
- Recurring occurrences that spawn next instances on completion
- Linked-record lifecycle sync with maintenance and compliance events

Notifications are designed to answer one question clearly:
**“What do I need to start thinking about now?”**

A header reminder bell surfaces overdue notifications and pending transactions on screen.

---

### 5. Equipment Inventory

The Equipment module tracks critical aircraft components independently of maintenance actions.

Each equipment record can include:

- Name and category
- Manufacturer and model
- Serial number
- Software version
- Installation date
- Warranty expiration
- Linked directives or notifications

This allows owners to track warranties, recurring requirements, and component-level obligations without searching through maintenance history.

---

### 6. Financials & Cost Insights

The financial module tracks ownership costs and provides analytical insights.

Transactions support:

- Income / expense direction
- Intent (Operation, Maintenance, Reserve, etc.)
- Category (Fuel, Oil & Consumables, Maintenance Parts, etc.)
- Status (Pending, Posted, Voided)
- Currency handling
- Cost allocation methods:
  - **Straight-line** — spread evenly across a date range
  - **Flight hours** — allocate based on aircraft usage
  - **Custom** — spread across a user-defined range
  - **None** — counted entirely in the transaction month
- Include/exclude toggles for cash flow, total cost, and cost-per-hour analysis

Subscriptions and commitments can be tracked, with automated recurring transaction generation.

Insights provide:

- True cost-per-hour analysis
- Cost structure breakdown (fixed vs. variable)
- Maintenance cost rollup
- Outlook projections
- Assumption visibility

---

### 7. Community Service Bulletins

Owners can manage and share aircraft-agnostic interpretations of service bulletins with the broader SlingologyMX community. Shared bulletins are decoupled from the original so that community updates do not affect the owner's private record.

---

### 8. Data Import, Export & Integrations

All user data can be exported for:

- Backup
- Spreadsheet analysis
- Migration to another system
- Personal archives

The app also supports importing data with cross-user ID remapping and duplicate detection.

External integrations allow third-party apps to push data into SlingologyMX using aircraft-scoped API keys:

- **Transaction ingest** — import operational expenses (e.g., from Ramp)
- **Counter ingest** — update Hobbs, Tach, and total-time counters

See `docs/FUNCTIONAL_SPEC.md` for the integration specification.

---

### 9. Dashboard & Visualization

The dashboard provides a consolidated view of:

- Upcoming notifications
- Counter status
- Open directives
- Recent activity
- Financial insights

The goal is situational awareness—not automation. The system highlights what matters without forcing a prescribed workflow.

---

## What This Project Is *Not*

- Not a replacement for paper logbooks
- Not a certified maintenance record system
- Not a fleet management platform
- Not a regulatory authority

Think of SlingologyMX as **planning radar**, not legal recordkeeping.

---

## Project Status

This repository represents an **early-adopter / exploratory project**. Features, data models, and UI flows may change or be discontinued as the project evolves.

Users are expected to:

- Maintain their own backups
- Keep primary records outside the system
- Treat this tool as advisory, not authoritative

---

## A Note on Philosophy

Aviation already has enough opaque systems, expensive subscriptions, and hidden assumptions. SlingologyMX is an experiment in building something smaller, clearer, and more honest—where the pilot remains firmly in command.

To learn more about the approach and capabilities refer to the following:

- [The Hybrid Logbook: A Practical Record-Keeping Model for GA Pilots and Owners](https://slingology.blog/2025/12/02/the-hybrid-logbook-a-practical-record-keeping-model-for-ga-pilots-and-owners/)
- [SlingologyMX Help Page](https://slingology.blog/slingologymx-help-pages/)

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui |
| Backend | Lovable Cloud (PostgreSQL, Auth, Edge Functions) |
| State | TanStack Query |
| PWA | Service worker with auto-update |

---

## Prerequisites

- Node.js 18+ (recommended: use [nvm](https://github.com/nvm-sh/nvm))
- npm or bun
- A Lovable Cloud backend (managed automatically when using Lovable)

---

## Local Development

```bash
# Clone the repository
git clone https://github.com/AlchemyGeek/SlingologyMX.git
cd SlingologyMX

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:8080`.

---

## Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_backend_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id
```

When deploying from Lovable, these values are configured automatically.

---

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # shadcn/ui components
│   └── ...             # Feature components
├── hooks/              # Custom React hooks
├── integrations/       # Backend client & types
├── lib/                # Utility functions
├── pages/              # Route pages
└── assets/             # Static assets

supabase/
├── config.toml         # Backend configuration
├── functions/          # Edge functions
└── migrations/         # Database migrations

docs/
└── FUNCTIONAL_SPEC.md  # Detailed feature documentation
```

---

## Database Schema

Key tables:

- `profiles` — User profile information
- `user_roles` — Role-based access control
- `aircraft` — Aircraft records
- `aircraft_counters` — Current counter values
- `aircraft_counter_history` — Counter change history
- `notifications` — Date and counter-based reminders
- `subscriptions` — Aviation subscription tracking
- `commitments` — Recurring financial commitments
- `transactions` — Financial transactions
- `maintenance_logs` — Maintenance records
- `maintenance_directive_compliance` — Compliance events
- `directives` — AD/SB/SI tracking
- `aircraft_directive_status` — Per-aircraft compliance status
- `equipment` — Component inventory
- `community_service_bulletins` — Shared service bulletins
- `aircraft_api_keys` — External integration keys

All user-facing tables implement Row-Level Security (RLS) policies.

---

## Deployment

### Via Lovable

The simplest way to deploy is through the Lovable platform. Changes pushed to the connected GitHub repository sync automatically.

### Self-Hosted

1. **Database Setup**
   - Provision a backend through Lovable Cloud or your own managed PostgreSQL/Supabase project
   - Run migrations from `supabase/migrations/`
   - Configure authentication settings

2. **Frontend Deployment**
   ```bash
   npm run build
   ```
   Deploy the `dist/` folder to any static hosting (Vercel, Netlify, Cloudflare Pages, etc.).

3. **Edge Functions**
   Deploy edge functions to your backend:
   ```bash
   supabase functions deploy
   ```

### Environment Configuration

Ensure these are configured in your hosting environment:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

---

## Authentication

The app uses backend auth with:

- Email/password authentication
- Email verification required
- Self-service password reset
- Admin-controlled signup toggle
- Google OAuth (when configured)

## User Roles & Membership

| Role | Capabilities |
|------|-------------|
| Regular Member | Full access to personal records |
| Admin | User management, system settings, all user data |

New users start with an "Applied" membership status and must be approved before accessing the system.

---

## License

This project is licensed under the Apache License, Version 2.0.
See the LICENSE file for details.
