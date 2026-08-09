# External Integration Ingest — SlingologyRamp v1

Goal: let external Slingology apps (starting with Ramp) push transaction data into MX via an aircraft-scoped API key and a single POST endpoint. Transactions land as Pending for owner review.

## Decisions from open questions

- Idempotency: Ramp sends a client `external_id`; MX stores it and enforces uniqueness per aircraft.
- Tires intent: `Maintenance`.
- `include_in_cost_per_hour`: `true` for all ingested transactions.
- API key management: per-aircraft on the Aircraft Profile page, plus an "Integrations" tab/summary on the user Profile page showing all keys across aircraft.

## 1. Database schema

### 1.1 `api_keys` table

Create `public.aircraft_api_keys`:

- `aircraft_id` (uuid, FK to aircraft, cascade delete)
- `key_hash` (text, indexed)
- `label` (text)
- `created_at`, `updated_at`, `last_used_at`, `revoked_at` (timestamps)

RLS: owners can manage keys for aircraft they own; service_role has full access for the edge function lookup. `revoked_at IS NOT NULL` means invalid.

### 1.2 `external_id` on transactions

Add `external_id text` to `public.transactions`.
Add partial unique index: `(aircraft_id, external_id) WHERE external_id IS NOT NULL`.

This powers idempotent duplicate handling without requiring a new reference type.

## 2. Edge function: integration-ingest

Create `supabase/functions/integration-ingest/index.ts`:

- Accepts `POST` with bearer API key.
- Validates CORS and method.
- Hashes the bearer token and looks up a non-revoked `aircraft_api_keys` row; rejects with `401` on miss/revoke.
- Updates `last_used_at` on successful lookup.
- Resolves `user_id` and `aircraft_id` from the key.
- Validates payload with Zod:
  - `external_id` (string, required)
  - `transaction_date` (YYYY-MM-DD)
  - `amount` (number >= 0)
  - `title` (string, optional — falls back to derived title)
  - `category` enum from Ramp mapping
  - `notes` (string, optional)
- Maps Ramp category → MX category/intent:
  - Fuel → Operation / Fuel
  - Oil → Operation / Oil & Consumables
  - Tires → Maintenance / Maintenance Parts
  - Other/misc → Operation / Other
- Sets defaults:
  - `currency` = USD
  - `direction` = Debit
  - `status` = Pending
  - `source` = Imported
  - `include_in_cash_flow` / `include_in_ownership_total` / `include_in_cost_per_hour` = true
  - `allocate_over_time` = false
  - `tags` = `["ramp-import"]`
- Checks for existing transaction by `(aircraft_id, external_id)`:
  - If found, returns the existing transaction id (200, idempotent no-op).
  - If not found, inserts the transaction and returns the new id (201).
- Returns clear 400 errors for malformed payloads.

Rate limiting: implement a simple per-key sliding window in-memory (e.g. 100 req/min) to blunt brute force. No external rate-limit store in v1.

## 3. UI: API key management

### 3.1 Aircraft Profile page

Add an "Integrations" card to `src/components/AircraftManagement.tsx` (or the per-aircraft profile view):

- List active keys: label, created date, last sync.
- "Generate Key" button: opens a dialog asking for a label (e.g. "Ramp"), then shows the plaintext key once with a Copy button and a "I've copied it" close action.
- Revoke button per key with confirmation.

### 3.2 User Profile combined view

Add an "Integrations" tab to `src/pages/Profile.tsx`:

- Show all keys across the user's aircraft.
- Columns/fields: aircraft registration, label, created, last sync, status.
- Provide revoke action (same confirmation as aircraft page).

## 4. UI: transaction list source visibility

In `src/components/TransactionList.tsx`:

- When a transaction has `source = Imported` and `tags` includes `"ramp-import"`, show a small badge or tooltip (e.g. "Ramp").
- No new filter required in v1; the existing source filter already covers Imported.

## 5. Ramp-side queue (specified, not built in MX)

Document the expected Ramp behavior in `docs/FUNCTIONAL_SPEC.md` or a new integration doc:

- Immediate send on save.
- On failure, queue in localStorage with retry on app open and network reconnect.
- Store returned MX transaction id to avoid duplicate sends.
- Show pending-sync count indicator.

## 6. Documentation & testing

- Update `docs/FUNCTIONAL_SPEC.md` with the integration endpoint path, auth method, payload shape, and field mapping.
- Add a basic edge-function unit test if the project has a test harness for functions; otherwise verify via curl/Postman after deploy.

## Out of scope (per spec)

- Photo/attachment upload from Ramp.
- Editing or deleting an MX transaction from Ramp.
- Two-way sync.
- Generic field-mapping UI.
- VOT/XC integrations (this spec establishes the pattern).

## Verification

- Generate a key for an aircraft, copy the plaintext, and POST a Ramp-shaped transaction.
- Confirm the transaction appears in MX as Pending with correct category, intent, tags, and `external_id`.
- POST the same `external_id` again and confirm the same transaction id is returned with no new row.
- Revoke the key and confirm the next POST returns 401.
- Confirm keys are visible both on the Aircraft Profile page and the Profile Integrations tab.
