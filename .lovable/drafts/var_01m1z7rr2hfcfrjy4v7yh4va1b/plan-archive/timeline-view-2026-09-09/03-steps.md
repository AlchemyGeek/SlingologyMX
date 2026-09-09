## Build order — one step per message

1. **Shell.** Timeline item in the sidebar after Calendar, empty panel, small-screen redirect card. No data.
2. **Data.** Gather maintenance logs, upcoming due items, directive compliance history, transactions, commitments and counter readings into one shared event list. Cross-check counts against Calendar for the same month.
3. **Projection.** Trailing six-month flying rate from counter history, hour-based due-date estimates, "whichever comes first" resolution, plus the editable rate override in Insights assumptions.
4. **Axis and motion.** Ticks, gridlines, today line, past shading, merged markers, wheel zoom anchored at the cursor, drag to pan, Today button, zoom slider.
5. **Clustering.** Pixel-distance grouping and the cluster list popup, with edge-clamped positioning.
6. **Lanes.** Continuous merged-to-lanes interpolation, lane tints and labels.
7. **Detail list.** Synced to the visible window, zoom-gated, hover highlights its marker.
8. **Filters and preview card.** Four category chips with counts, confirmed/projected legend, hover preview on desktop and two-tap on tablet, plus the "open full record" link.
9. **Tablet pass.** Pinch zoom, 44px tap targets, icon rail sidebar at narrow widths.

## Technical notes

- New files under `src/components/timeline/` (panel, axis, marker, cluster popover, preview card, detail list, filters), plus `src/lib/timelineEvents.ts`, `src/lib/timelineProjection.ts`, `src/hooks/useTimelineEvents.ts`.
- `DashboardView` union gains `"timeline"`; `Dashboard.tsx` renders `<TimelinePanel />`. All queries scoped by `user_id` + `aircraft_id` from `AircraftContext`, mirroring `CalendarPanel.tsx`.
- Zoom state: `spanDays` clamped to [7, 2200] (default 365) and `centerMs`. `laneT = clamp((300 - spanDays) / 170, 0, 1)`; marker y interpolates from the merged baseline to its lane centre. Clustering gap 26px, per-category once `laneT > 0.5`.
- Confidence: `actual` / `scheduled` render solid, `projected` renders hollow with a dashed category-coloured ring. Text surfaces reuse the Insights badge, extracted from `InsightContainer.tsx` into a shared component with a third `scheduled` variant.
- Category colours reuse existing tokens: maintenance amber (`.calendar-maintenance-day`), directives purple (`.calendar-directive-day`), financial `--primary`, counters teal. Calendar's status-dot palette is not reused.
- Opening records: a read-only summary dialog holds the event fields plus a "Open full record" action that switches `activeView` and passes a preselected record id. Step 8 adds a small `initialRecordId` prop to the maintenance, directives, transactions and counters panels so they can open that record on mount — the only change outside the timeline folder.
- Step 3 stages one additive database change: a per-aircraft utilization rate override column. It takes effect when you accept this draft, not before.
- Projected markers are suppressed entirely when there is no counter history; the detail list shows a one-line note instead of guessing.
