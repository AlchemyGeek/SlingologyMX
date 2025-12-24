# SlingologyMX

Aircraft maintenance tracking and compliance management system for experimental aircraft owners.

## SlingologyMX — Aircraft Maintenance & Operations Dashboard

SlingologyMX is a lightweight, owner-centric web application for tracking aircraft maintenance, compliance, and operational planning. It is designed primarily for individual aircraft owners and builders—especially those operating Experimental/Amateur-Built aircraft—who want better visibility and planning tools without surrendering control of their data.

This project is intentionally simple, transparent, and extensible. It does **not** attempt to replace paper logbooks or scanned records. Instead, it acts as a digital command center layered on top of your existing records.

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
- Trigger method (time, cycles, calendar, one-time)
- Current status (Open, Compliant, Completed, Not Applicable)
- Optional linkage to maintenance records

This allows owners to plan compliance without embedding compliance logic into log entries themselves.

---

### 3. Counters & Time-Based Tracking

SlingologyMX supports counter-based tracking for items such as:
- Engine hours
- Propeller hours
- Oil changes
- Condition inspections
- Other recurring events

Counters drive notifications and visualization rather than enforcing workflow. Owners remain responsible for determining when work is actually performed.

---

### 4. Notification System

The notification engine provides advance awareness of upcoming events, including:
- Time-based thresholds
- Calendar-based expirations
- Counter-driven limits

Notifications are designed to answer one question clearly:
**“What do I need to start thinking about now?”**

---

### 5. Equipment Inventory

The Equipment module tracks critical aircraft components independently of maintenance actions.

Each equipment record can include:
- Name and category
- Manufacturer and model
- Serial number
- Installation date
- Warranty expiration
- Linked directives or notifications

This allows owners to track warranties, recurring requirements, and component-level obligations without searching through maintenance history.

---

### 6. Dashboard & Visualization

The dashboard provides a consolidated view of:
- Upcoming notifications
- Counter status
- Open directives
- Recent activity

The goal is situational awareness—not automation. The system highlights what matters without forcing a prescribed workflow.

---

### 7. Data Export & Portability

All user data can be exported for:
- Backup
- Spreadsheet analysis
- Migration to another system
- Personal archives

This project explicitly avoids data lock-in.

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


SlingologyMX is a web-based application designed to help aircraft owners manage:
- **Maintenance Logs** - Track all maintenance activities with detailed records
- **Directives & Bulletins** - Monitor compliance with ADs, Service Bulletins, and manufacturer alerts
- **Aircraft Counters** - Track Hobbs, Tach, and component total times
- **Subscriptions** - Manage aviation-related subscriptions and renewals
- **Notifications** - Date-based and counter-based maintenance reminders

To learn more about the approach and capabilities refer to the following:
- [	
The Hybrid Logbook: A Practical Record-Keeping Model for GA Pilots and Owners](https://slingology.blog/2025/12/02/the-hybrid-logbook-a-practical-record-keeping-model-for-ga-pilots-and-owners/)
- [SilgologyMX Help Page](https://slingology.blog/slingologymx-help-pages/)

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions) |
| State | TanStack Query |

## Prerequisites

- Node.js 18+ (recommended: use [nvm](https://github.com/nvm-sh/nvm))
- npm or bun
- Supabase account (for backend services)

## Local Development

```bash
# Clone the repository
git clone <repository-url>
cd slingologymx

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

## Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id
```

## Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # shadcn/ui components
│   └── ...             # Feature components
├── hooks/              # Custom React hooks
├── integrations/       # Supabase client & types
├── lib/                # Utility functions
├── pages/              # Route pages
└── assets/             # Static assets

supabase/
├── config.toml         # Supabase configuration
├── functions/          # Edge functions
└── migrations/         # Database migrations

docs/
└── FUNCTIONAL_SPEC.md  # Detailed feature documentation
```

## Database Schema

Key tables:
- `profiles` - User profile information
- `user_roles` - Role-based access control
- `aircraft_counters` - Current counter values
- `aircraft_counter_history` - Counter change history
- `notifications` - Date and counter-based reminders
- `subscriptions` - Aviation subscription tracking
- `maintenance_logs` - Maintenance records
- `directives` - AD/SB/SI tracking
- `aircraft_directive_status` - Per-aircraft compliance status
- `maintenance_directive_compliance` - Compliance events

All tables implement Row-Level Security (RLS) policies.

## Deployment

### Self-Hosted

1. **Database Setup**
   - Create a Supabase project
   - Run migrations from `supabase/migrations/`
   - Configure authentication settings

2. **Frontend Deployment**
   ```bash
   npm run build
   ```
   Deploy the `dist/` folder to any static hosting (Vercel, Netlify, Cloudflare Pages, etc.)

3. **Edge Functions**
   Deploy edge functions to your Supabase project:
   ```bash
   supabase functions deploy
   ```

### Environment Configuration

Ensure these are configured in your hosting environment:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

## Authentication

The app uses Supabase Auth with:
- Email/password authentication
- Email verification required
- Self-service password reset
- Admin-controlled signup toggle

## User Roles

| Role | Capabilities |
|------|-------------|
| Regular Member | Full access to personal records |
| Admin | User management, system settings, all user data |

## License

This project is licensed under the Apache License, Version 2.0.
See the LICENSE file for details.
