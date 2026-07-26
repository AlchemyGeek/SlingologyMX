
# Mobile UI — P0 pass

Goal: make the app usable on a phone (≤640px) without horizontal scrolling or truncated forms. No functional changes — presentation only.

## 1. Remove forced content width (Dashboard shell)

`src/pages/Dashboard.tsx`
- Drop the `min-w-[600px]` wrapper inside `<main>`.
- Reduce mobile padding: `p-3 sm:p-6`, keep `space-y-6`.
- Header row: hide the "Profile" and "Logout" text labels under `sm` (icon-only, keep aria-label). Keeps counters + bell + aircraft switcher fitting on a phone.
- `AircraftSwitcher` wrapper: change `ml-4` to `ml-2 sm:ml-4`.
- Card wrapper around panels: `p-3 sm:p-6` instead of `p-6`.

## 2. Responsive Aircraft Counters strip

`src/components/AircraftCountersDisplay.tsx`
- The loading grid already uses `grid-cols-2 md:grid-cols-5`; apply the same to the real grid (currently a wide row). Result: 2 tiles per row on phone, 5 on desktop.
- Tighten tile padding on mobile (`p-3 sm:p-4`), reduce number size to `text-xl sm:text-2xl`.
- Header row (title + History button): wrap; make History button `size="icon"` on mobile.

## 3. Card view for main list panels (under `md`)

Convert the `<Table>` in these panels to a stacked card layout on mobile, keep the table on `md+`. Each card shows: primary title, meta line (date / status badge), and a small right-aligned action menu.

Files:
- `src/components/TransactionList.tsx`
- `src/components/NotificationList.tsx` (and `CounterNotificationList.tsx`)
- `src/components/HistoryPanel.tsx`
- `src/components/MaintenanceLogList.tsx`
- `src/components/DirectiveList.tsx`
- `src/components/EquipmentList.tsx`
- `src/components/SubscriptionList.tsx`
- `src/components/ReserveList.tsx`

Pattern for each list:

```tsx
{/* mobile */}
<div className="md:hidden space-y-2">
  {rows.map(row => (
    <button key={row.id} onClick={() => open(row)}
      className="w-full text-left rounded-lg border bg-card p-3 active:bg-accent">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium truncate">{row.title}</p>
          <p className="text-xs text-muted-foreground">{row.meta}</p>
        </div>
        <Badge>{row.status}</Badge>
      </div>
    </button>
  ))}
</div>

{/* desktop */}
<div className="hidden md:block">
  <Table>…existing table…</Table>
</div>
```

Filter chips / toolbar above each list: add `flex-wrap gap-2` so they wrap instead of overflowing.

## 4. Full-screen sheets for heavy forms on mobile

Wrap the largest edit dialogs in a responsive shell: `Sheet` (bottom, full height) under `md`, keep `Dialog` on desktop. Sticky footer with Save/Cancel.

Files:
- `src/components/MaintenanceLogForm.tsx`
- `src/components/TransactionForm.tsx`
- `src/components/DirectiveForm.tsx`
- `src/components/EquipmentForm.tsx`
- `src/components/SubscriptionForm.tsx`
- `src/components/ReserveForm.tsx`
- `src/components/NotificationForm.tsx`
- `src/components/BatchCounterEditDialog.tsx`

Shell pattern (new small helper `src/components/ui/responsive-form-shell.tsx`):

```tsx
// Mobile: <Sheet side="bottom" className="h-[100svh] w-full max-w-none rounded-none p-0 flex flex-col">
//   <header sticky top>title + close</header>
//   <div className="flex-1 overflow-y-auto p-4">{children}</div>
//   <footer sticky bottom border-t p-3 bg-background">{actions}</footer>
// Desktop: existing <Dialog>
```

Each form file:
- Replace top-level `<Dialog>` with `<ResponsiveFormShell>`.
- Move existing Save/Cancel buttons into the shell's `actions` slot.
- No change to form logic, validation, or submit handlers.

## 5. Small mobile-only polish inside forms

Applied while touching each form above:
- Number inputs: add `inputMode="decimal"` (amounts, counters, hours).
- Grid columns inside forms: switch `grid-cols-2` → `grid-cols-1 sm:grid-cols-2` where fields become too narrow (<160px).

## Out of scope (P1/P2 — will be a separate pass)

Header overflow menu for Profile/Logout, insights charts, safe-area padding, toaster reposition, 44px tap-target audit, date-picker collision handling, `font-size:16px` on inputs to prevent iOS zoom.

## Verification

After changes, at 375px viewport:
- No horizontal scrollbar on any dashboard view.
- Counters render 2-up, main list panels render as cards, opening any of the eight forms fills the screen with a sticky action bar.
- At `md+` (≥768px), UI is visually identical to today.
