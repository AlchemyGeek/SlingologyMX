# SlingologyMX Functional Specification

**Application version:** v26.08.01
**Spec version:** 2.0
**Last Updated:** August 17, 2026
**Source:** https://github.com/AlchemyGeek/SlingologyMX
**Hosted app:** https://slingologymx.lovable.app

---

## 1. Overview

### 1.1 Purpose
SlingologyMX is a web-based maintenance, compliance and cost-tracking system for experimental aircraft owners. It lets owners track maintenance activity, manage regulatory and manufacturer requirements (ADs, Service Bulletins), monitor aircraft counters, track equipment, manage ownership costs, and receive timely notifications.

The system is a **planning radar**, not a certified record of airworthiness. Paper/scanned logbooks remain the legal source of truth; SlingologyMX stores structured metadata, planning signals and cost data on top of them.

### 1.2 Target Users
- Experimental aircraft owners and builders
- Owners maintaining their own aircraft
- A&P / LSRM mechanics supporting experimental aircraft

### 1.3 Technology Stack
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query
- **Backend:** Lovable Cloud (Supabase) — PostgreSQL, Auth, Edge Functions
- **Delivery:** Installable PWA with `autoUpdate` service worker (Supabase API calls always NetworkOnly)
- **Design:** Mobile-first responsive UI; list views collapse to cards on phones and action buttons render icon-only

---

## 2. User Management

### 2.1 User Roles
| Role | Description |
|------|-------------|
| **Regular Member** | Default role. Full access to own aircraft and records. |
| **Admin** | Full system access, user management, all user data. |

Roles are stored in a dedicated `user_roles` table and evaluated through a security-definer `has_role()` function to prevent privilege escalation.

### 2.2 Membership Status
| Status | Description |
|--------|-------------|
| **Applied** | New user awaiting verification/approval |
| **Approved** | Active user with full access |
| **Suspended** | Access revoked by admin; sessions invalidated |

### 2.3 Authentication Flow
1. **Sign Up:** name, email, password, location, aircraft registration and model. Account created as "Applied". Signup may be gated by an access code and by a global signup toggle.
2. **Login:** email + password. Suspended users are blocked. Password reset via email.
3. **Password policy:** minimum 12 characters with uppercase, lowercase, number and special character.
4. **Logout:** clears session and redirects to the auth page.

### 2.4 User Profile
Profile page tabs:
- **Profile** — name, email (read-only), location, contact details
- **My Aircraft** — add/edit/delete aircraft, counters configuration, acquisition values
- **Integrations** — create, view and revoke API keys across all owned aircraft
- **Admin** (admin only) — user management and system settings

Aircraft deletion requires typing `DELETE MY AIRCRAFT` to confirm.

---

## 3. Multi-Aircraft Support

- A user may own multiple aircraft; every record (counters, maintenance, directives, equipment, notifications, financials) is scoped by `aircraft_id`.
- An aircraft switcher in the header selects the active aircraft (registration only is displayed).
- All forms, lists, insights and exports strictly filter by the active `aircraft_id`.

---

## 4. Aircraft Counters

### 4.1 Counter Types
| Counter | Description |
|---------|-------------|
| **Hobbs** | Hobbs meter time |
| **Tach** | Tachometer time |
| **Airframe Total Time** | Total airframe hours |
| **Engine Total Time** | Total engine hours |
| **Prop Total Time** | Total propeller hours |

### 4.2 Tracking Modes
Each total-time counter can be configured as:
- **Linked to Hobbs** — derived automatically from the Hobbs delta
- **Linked to Tach** — derived automatically from the Tach delta
- **Manual** — entered directly

Acquisition counters record the component times at purchase, so ownership-period usage can be separated from lifetime totals.

### 4.3 Counter Management
- All counter changes are made through the **Edit All Counters** batch dialog to keep values consistent.
- Counters must be monotonically increasing and chronologically consistent; decreasing values are rejected.
- Engine/Prop total time can be reset to 0 (overhaul/replacement) from the Profile aircraft settings.
- Counters are displayed responsively at the top of the dashboard.

### 4.4 Counter History
- Every change is logged with date, resulting values, and source: `Dashboard`, `Maintenance Record`, or `Integration`.
- History is viewable per aircraft and supports **revert** to a prior point (deleting subsequent entries).
- Counter values between recorded points are linearly interpolated/extrapolated for financial analysis.

### 4.5 Counter Sync with Maintenance Records
- Counter fields on maintenance forms auto-populate from the previous history entry.
- If an entered value exceeds the current global counter, the user is prompted to update global counters on save.
- Non-Hobbs counters offer a sync toggle.

---

## 5. Notifications & Reminders

### 5.1 Notification Types
Maintenance, Subscription/Commitment, Directives, Equipment (warranty), Other.

### 5.2 Notification Basis
| Basis | Description |
|-------|-------------|
| **Date-Based** | Triggered by calendar date |
| **Counter-Based** | Triggered by aircraft usage (counter value) |

### 5.3 Fields
Description (max 200), Type, Component (Airframe/Propeller/Avionics/Other), initial date or counter value, recurrence (None, Weekly, Bi-Monthly, Monthly, Quarterly, Semi-Annual, Yearly), notes (max 1000), alert threshold (days, default 7; or hours, default 10).

### 5.4 Behavior
- Completion stamps `completed_at`. Recurring notifications spawn the next occurrence; only the completed instance closes.
- Deleting a notification removes the whole sequence.
- System-generated notifications have restricted field editing to stay in sync with their source record.

### 5.5 Alert States
| State | Indicator |
|-------|-----------|
| Normal | Primary blue |
| Reminder (within threshold) | Orange |
| Due / Overdue | Red |

### 5.6 Linked Records
- Notifications generated by maintenance, directives, commitments or equipment warranties are linked to their source.
- A link icon is shown while linked and unmodified. User edits detach the notification.
- Source updates or deletions cascade to linked, unmodified notifications (switching type or deleting as appropriate).

### 5.7 Header Reminder Bell
- A bell in the header shows a red badge with the count of **overdue notifications** and **pending transactions**.
- Clicking an item navigates to the relevant panel with the matching filter applied.
- The reminder can be snoozed.

---

## 6. Equipment

Equipment records track components independently of maintenance actions.

Fields: name, category (Airframe, Appliance, Avionics, Engine, Propeller, System, Other), install context (Installed, Portable, Tool, Other), manufacturer, model designation, part number, serial number, **software version**, install date, warranty expiration, purchase/cost details, notes.

Behavior:
- Warranty expiration automatically creates a linked notification.
- Equipment can be referenced from directives/service bulletins, auto-populating model and serial details.

---

## 7. Maintenance Logs

### 7.1 Categories
Airplane (default), Airframe, Engine, Propeller, Avionics, Electrical, Interior, Exterior, Accessories, Other.

### 7.2 Subcategories
Inspection, Repair, Replacement, Modification, Software Update, Compliance, Troubleshooting, Scheduled Maintenance, Other.

### 7.3 Required Fields
Entry title, category/subcategory, date performed, performed-by type (Owner, A&P, LSRM, Repairman, Shop, Other), performed-by name, and all time & usage counters.

### 7.4 Optional Fields
Tags, organization, vendor, invoice number, cost breakdown (parts, labor, other → auto total), internal notes, attachment URLs with descriptions.

### 7.5 Recurring Maintenance
| Type | Description |
|------|-------------|
| **Interval (date-based)** | Monthly, Semi-Annual, Annual; next due date auto-calculated |
| **Counter (usage-based)** | Counter type + increment |
| **Mixed** | Both; whichever comes first |

Recurring records auto-generate the next-due notification; the next due date can be overridden manually.

### 7.6 Cost & Financial Linkage
- Cost fields generate linked financial transactions (Maintenance Labor / Maintenance Parts / Maintenance (Unspecified)).
- Editing a maintenance record **preserves the existing status** of already-generated transactions (Posted stays Posted).
- Deleting a maintenance record voids its generated transactions.

### 7.7 Directive Linking
- A maintenance record can link to multiple directives via a junction table.
- Each link carries a compliance status (Not Complied / Complied).
- Marking "Complied" creates a compliance event whose date is inherited from **Date Performed**.

---

## 8. Directives & Bulletins

### 8.1 Types
FAA Airworthiness Directive, Manufacturer Alert, Manufacturer Mandatory, Service Bulletin, Service Instruction, Information Bulletin, Other.

### 8.2 Categories
Airframe, Engine, Propeller, Avionics, System, Appliance, Other.

### 8.3 Severity
Emergency, Mandatory, Recommended, Informational.

### 8.4 Status
Active (default), Superseded, Cancelled, Proposed, Completed, Resolved.

`Resolved` marks a requirement fulfilled without further action and deletes linked notifications.

### 8.5 Compliance Scope
One-Time, Recurring, Conditional, Informational Only.

### 8.6 Applicability
Category, model, applicable serial range, applies-to-my-aircraft (Applies / Does Not Apply / Unsure), reason, applicability notes, optional equipment link.

### 8.7 Initial Due Type
| Type | Fields | Notification |
|------|--------|--------------|
| Before Next Flight | — | Date-based, today |
| At Next Inspection | — | Date-based, today |
| By Date | Date picker | Date-based |
| By Calendar (Months) | Months + auto date | Date-based |
| By Total Time (Hours) | Counter type + value | Counter-based |
| Other | — | None |

### 8.8 Recurring Directives
Repeat every N months (date-based) or every N hours (counter-based). Not available for "Other".

### 8.9 Compliance Events
- Stored centrally in `maintenance_directive_compliance` (single source of truth).
- Created exclusively through maintenance records; the directive detail view shows them read-only.
- Fields: compliance date, status, counter values where applicable.

### 8.10 Auto-Completion
On "Complied":
- **One-Time:** directive auto-marked Completed
- **Recurring/Conditional:** user prompted to complete
- Linked, unmodified notifications are removed; recurring directives spawn the next occurrence

### 8.11 Compliance Analysis Card
First/last compliance dates, counter info, total compliance events, pending notifications.

### 8.12 Constraints
- Directive code is unique per user **and aircraft**.
- Completed directives cannot receive new compliance events.
- Strict character limits on code, title and description fields.

---

## 9. Community Service Bulletins

- Owners can share **aircraft-agnostic** interpretations of service bulletins with the community.
- Shared bulletins are fully **decoupled** from the owner's private record after sharing: later edits on either side do not propagate.
- Sharing maps core metadata (type, severity, model designation, summary, references) and excludes aircraft-specific data (serials, compliance events, counters).
- Equipment **model designation** is the primary identifier of the targeted equipment.
- Community members can leave feedback and mark usage; update notifications flag new revisions (the maintainer's own updates do not raise a red dot for themselves).

---

## 10. Financials

### 10.1 Transactions
Fields: title, date, amount, currency (default USD), direction (Debit/Credit), intent, category, status, source, tags, notes, reference to the originating record.

| Enum | Values |
|------|--------|
| **Intent** | Ownership, Operation (default), Maintenance, Compliance, Capital, Training, Travel, Other |
| **Category** | Fuel (default), Oil & Consumables, Maintenance Labor, Maintenance Parts, Maintenance (Unspecified), Hangar / Tie-Down, Insurance, Avionics, Training, Travel, Tools & Equipment, Other |
| **Status** | Pending, Posted, Skipped, Voided |
| **Source** | Manual, Commitment, Imported, Maintenance |

Analysis flags per transaction: include in **Cash Flow**, include in **Total Cost**, include in **Cost-Per-Hour**.

### 10.2 Cost Allocation / Amortization
| Method | Behavior |
|--------|----------|
| **None** | Full amount counted in the transaction month |
| **Straight-line** | Spread evenly across a period (Days or Months) |
| **By Flight Hours** | Allocated in proportion to actual counter usage |
| **Custom** | Spread across a user-defined start and end date |

Allocation smooths irregular costs for insight calculations without changing the recorded cash transaction.

### 10.3 Commitments (Subscriptions & Recurring Costs)
- Taxonomy of 12 commitment categories (EFB & flight planning, avionics subscriptions, tracking services, proficiency & safety, community memberships, weather, magazines, operations & financial tools, hardware annual fees, insurance add-ons, other).
- Fields: name, type, cost, initial date, recurrence, notes.
- A daily scheduled job generates upcoming transactions from active commitments; generated transactions link back to their commitment.
- Reminder notifications are derived from the recurrence pattern.
- A backfill workflow creates missed historical occurrences.

### 10.4 Reserves
Reserves accrue money against future large expenses (engine overhaul, prop, paint, avionics, other).

| Basis | Required inputs |
|-------|-----------------|
| **Calendar** | Interval value + unit, start date |
| **Hours** | Limit hours, counter type, start counter value |
| **Cycles** | Limit cycles, start cycle count |

Accrual method: Straight-line (default) or usage-driven. Reserves feed the true cost-per-hour calculation.

### 10.5 Insights
| Insight | Purpose |
|---------|---------|
| **What Happened** | Historical spend by period and category |
| **Cost Structure** | Fixed vs variable split; respects the include-in-cost-per-hour flag |
| **True Cost** | All-inclusive cost per flight hour using actual transactions plus reserve accruals |
| **Outlook** | Forward projection of fixed, variable and recurring costs |
| **Assumptions** | Transparency on the inputs, counters and interpolation used |

**Maintenance rollup:** for display and analysis, Maintenance Labor, Maintenance Parts and Maintenance (Unspecified) are rolled into a single **Maintenance** bucket via a shared category rollup helper, so maintenance can be understood as one share of total cost.

Transactions tied to recurring maintenance are excluded from generic historical cost-per-hour projections to avoid double counting against their own forecast line.

---

## 11. Calendar View

- Unified calendar of notifications, maintenance records and directive events with color coding (notifications blue, maintenance secondary, directives purple).
- Alert status colors: normal blue, reminder orange, due/overdue red.
- Only **date-based** notifications appear (counter-based are excluded).
- Maintenance is shown on `date_performed` only, never on projected due dates.
- Multiple record types on one date render as a diagonal gradient; clicking a date lists all records.

---

## 12. History Panel

| Tab | Records |
|-----|---------|
| Notifications | Completed notifications |
| Maintenance | All maintenance records |
| Directives | Directive history events (create, delete, compliance) |
| Transactions | Posted transactions (emerald badge) |

Each tab supports text search, dropdown filters and independent sortable columns.

---

## 13. Data Management

### 13.1 Export
| Format | Description |
|--------|-------------|
| **JSON** | Machine-readable, re-importable |
| **Excel** | One worksheet per table, human-readable |

Excel exports replace UUIDs with human-readable IDs of the form `PREFIX-YYMMDD-NNN`.

| Table | Prefix |
|-------|--------|
| Directives | DIR |
| Commitments / Subscriptions | SUB |
| Maintenance Logs | MNT |
| Notifications | NOT |
| Equipment | EQP |
| Transactions | TRX |
| Reserves | RSV |
| Aircraft Counters | CNT |
| Aircraft Counter History | CNH |
| Aircraft Directive Status | ADS |
| Directive History | DHI |
| Maintenance Directive Compliance | MDC |

### 13.2 Import
- JSON only; new UUIDs generated with cross-user ID remapping and relation mapping.
- Duplicate detection by business key; import summary shown on completion.

### 13.3 Excluded from Export
Bug reports, feature requests, profile information, raw `user_id` values.

### 13.4 Local Undo
Deletions offer a 20-second client-side window to restore the removed record.

---

## 14. Bug Reporting

**User fields:** title, description, actual result (all required), steps to reproduce, expected result, category, severity (Minor/Moderate/Major/Critical), browser/OS/device, attachment URL.

**Admin fields:** status (New, In Progress, Waiting for User, Resolved, Closed (Won't Fix), Closed (Duplicate)), priority (Low/Medium/High/Urgent), assignee, root cause, resolution summary, internal notes.

**Access:** users see only their own reports; admins see all; authentication required.

---

## 15. Feature Requests

- Fields: title (max 200), description (max 2000), vote count, status (Open, Completed, Duplicate, Closed), admin comment.
- One vote per user per feature (upvote/downvote); sorted by votes.
- Tabs: Open (votable) and Closed (read-only). Only admins change status or comment.

---

## 16. Admin Capabilities

### 16.1 User Management
View all users with name, email, role, membership status and per-table record counts.

### 16.2 Operations
| Operation | Description |
|-----------|-------------|
| Switch Role | Toggle Regular / Admin |
| Set Password | Generate a strong password |
| Suspend / Unsuspend | Change membership status and force logout |
| Wipe Database | Delete all user records except bug reports and feature requests |
| Delete User | Anonymize contributions and delete the account |

### 16.3 System Settings
- Signup enable/disable toggle
- Access code management (validate/decrement edge functions, owner-verified)
- Admin notification badges for new users, bug reports and feature requests

---

## 17. Navigation Structure

### 17.1 Header
Aircraft switcher (registration only), reminder bell, profile link, logout.

### 17.2 Sidebar
```
Events
├── Calendar
├── Counters
├── Notifications
└── History

Logs
├── Equipment
├── Maintenance
└── Directives & Bulletins

Financial
├── Transactions
├── Commitments
├── Reserves
└── Insights

Support
├── Releases (external)
├── Blog (external)
├── Discord (external)
├── Data Management
├── Bug Reports
└── Feature Requests
```

The current application version is displayed at the bottom of the sidebar.

### 17.3 Mobile Behavior
- No forced minimum widths; counters and charts are responsive.
- Lists (transactions, notifications, directives, maintenance, equipment, insights tables) render as stacked cards on phones.
- Action buttons show icons only; create buttons use a `+` icon.
- Numeric inputs use `inputMode="decimal"`; tap targets are at least 44px; safe-area padding is applied.

---

## 18. Date Handling

- All date fields accept both a calendar picker and direct text entry.
- Date-only strings (`YYYY-MM-DD`) are parsed as local dates through a `parseLocalDate` utility to prevent timezone shifting.

---

## 19. Security

### 19.1 Row-Level Security
- RLS is enabled on every public table with PERMISSIVE policies scoped `TO authenticated`.
- Users access only their own records; admins access all via `has_role()`.
- Every table has explicit `GRANT`s; the `anon` role has no broad table access (GraphQL introspection exposure is closed).
- Views use the SECURITY INVOKER pattern; `public_profiles` exposes display names only.

### 19.2 Authentication
- Server-side session validation, immediate revocation on suspension, hashed passwords.
- Anonymous sign-ups are disabled.

### 19.3 Functions
- Internal `SECURITY DEFINER` functions have `EXECUTE` revoked from public roles except where required by RLS helpers.
- Admin edge functions verify the caller's JWT and admin role before acting.

### 19.4 Privacy
Display names can mask real identities in community-facing surfaces.

---

## 20. External Integrations

### 20.1 Overview
Third-party applications (first integration: **Ramp**) can push data into SlingologyMX over HTTPS using aircraft-scoped API keys. Two endpoints exist: transaction ingest and counter ingest.

### 20.2 Authentication
- Each aircraft has one or more API keys, created and revoked from **Profile → Integrations**.
- Keys are hashed (SHA-256) before storage; the raw key is displayed once at creation.
- Requests present the key in the `X-API-Key` header. Revoked keys stop working immediately.

### 20.3 Transaction Ingest
`POST https://<project>.supabase.co/functions/v1/integration-ingest`
Header: `X-API-Key: <raw-key>`

```json
{
  "external_id": "ramp_abc123",
  "transaction_date": "2026-08-11",
  "amount": 145.32,
  "category": "Fuel",
  "title": "KPAO fuel",
  "notes": "optional"
}
```

| Field | Rules |
|-------|-------|
| `external_id` | required, 1–255 chars, idempotency key |
| `transaction_date` | required, `YYYY-MM-DD` |
| `amount` | required, non-negative number |
| `category` | required, one of `Fuel`, `Oil`, `Tires`, `Other` |
| `title` | optional, ≤255 chars |
| `notes` | optional, ≤2000 chars |

**Category mapping**

| Incoming | MX category | MX intent |
|----------|-------------|-----------|
| Fuel | Fuel | Operation |
| Oil | Oil & Consumables | Operation |
| Tires | Maintenance Parts | Maintenance |
| Other | Other | Operation |

Imported transactions are tagged `ramp-import`, display a **Ramp** badge, and default to `include_in_cost_per_hour = true`.

**Responses**

| Code | Body | Meaning |
|------|------|---------|
| 201 | `{ "id": "...", "status": "created" }` | New transaction created |
| 200 | `{ "id": "...", "status": "existing" }` | Same `external_id` already stored (idempotent success) |
| 400 | `{ "error": "Invalid payload", ... }` | Validation failure or malformed JSON |
| 401 | `{ "error": "Unauthorized" }` | Missing, unknown or revoked key |
| 405 | `{ "error": "Method not allowed" }` | Non-POST request |
| 500 | `{ "error": "Internal server error" }` | Server-side failure |

If a transaction is deleted inside MX, resending the same `external_id` creates it again.

### 20.4 Counter Ingest
`POST https://<project>.supabase.co/functions/v1/integration-counters`
Header: `X-API-Key: <raw-key>` (same per-aircraft key)

```json
{
  "hobbs": 104.4,
  "tach": 104.4,
  "change_date": "2026-08-11"
}
```

- Any **subset** of `hobbs`, `tach`, `airframe_total_time`, `engine_total_time`, `prop_total_time` may be sent; at least one is required. Omitted counters are untouched.
- `change_date` is optional (`YYYY-MM-DD`), defaults to today.
- No `external_id` is used on this endpoint.
- Values that would decrease an existing counter are rejected with `400`.
- Total-time counters configured as linked to Hobbs or Tach are derived automatically from the incoming delta and cannot be set directly.
- Global counters are updated and a counter history entry is written with source `Integration`.
- Success returns `200` with the resulting counter values.

Sending a counter payload to `integration-ingest` (or a transaction payload to `integration-counters`) fails validation with `400`; each endpoint accepts only its own schema.

---

## 21. Database Schema

### 21.1 Identity & Core
`profiles`, `public_profiles` (view), `user_roles`, `aircraft`, `aircraft_counters`, `aircraft_counter_history`, `aircraft_api_keys`

### 21.2 Records
`maintenance_logs`, `directives`, `equipment`, `notifications`, `subscriptions` (commitments), `transactions`, `reserves`

### 21.3 Supporting
`aircraft_directive_status`, `directive_history`, `maintenance_directive_compliance`, `community_service_bulletins`, `community_sb_feedback`, `community_sb_usage`, `community_sb_update_notifications`, `bug_reports`, `feature_requests`, `feature_votes`, `app_settings`, `access_codes`, `admin_notification_status`

### 21.4 Edge Functions
`integration-ingest`, `integration-counters`, `admin-set-password`, `admin-user-suspend`, `admin-delete-user`, `validate-access-code`, `decrement-access-code`

### 21.5 Scheduled Jobs
Daily `pg_cron` job generating commitment transactions.

---

## Appendix A: Recurrence Intervals

| Value | Period |
|-------|--------|
| Weekly | 7 days |
| Bi-Monthly | 2 months |
| Monthly | 1 month |
| Quarterly | 3 months |
| Semi-Annual | 6 months |
| Yearly | 12 months |
| None | Non-recurring |

---

## Appendix B: Bug Report Categories

Authentication, Dashboard, Notifications, Maintenance Logs, Directives, AD / Service Bulletins, Subscriptions, Financial Records, Insights, Equipment, Calendar, Counters, Profile / Account, Data Export, Data, UI/Display, Performance, Other.

---

## Appendix C: Disclaimer

SlingologyMX is provided for planning and situational awareness only. It is not an approved maintenance record system and does not replace required logbooks, signatures, or a mechanic's judgment. The owner remains responsible for airworthiness and regulatory compliance.
