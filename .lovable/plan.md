# Oil Analysis: metric overview grid with drill-down

## What changes
On the **Trends & Health** tab, replace the single "Metric" dropdown + one big chart with:

1. **Overview grid** of small tiles, one per metric (all elements and properties, e.g. Iron, Copper, Aluminum, Viscosity...).
   - Each tile: metric name + unit, latest value, change first → latest (%), and a tiny line (sparkline) of the trend.
   - Tile border/accent turns warning/red when the latest value is outside the lab range; neutral otherwise.
   - Metrics with no numeric readings show "No data" and a muted look (kept in grid, sorted to the end).
   - Responsive: 2 columns on phone, 3-4 on tablet, 5-6 on desktop.
2. **Click a tile** to open the full chart (the existing detailed chart with stats, fleet average, lab min/max and Rotax watch lines) in a large dialog (full-screen sheet on phone). Close returns to the grid.
3. Existing filters (Engine, Measured / Per oil hour, Date / Engine hours) stay at the top and apply to both the tiles and the expanded chart.
4. The Latest Health Review section below remains unchanged.

## Technical details
- Refactor `OilAnalysisTrends.tsx`: extract a pure `buildMetricSeries(samples, metric, basis, axis)` helper (points, mean, latest, change, outOfRange) into `src/lib/oilAnalysis.ts` with tests (qualified/detection-limit readings stay excluded, missing values never become zero).
- New `MetricTile` using recharts `LineChart` without axes/grid; full chart moved into `MetricDetailChart` rendered inside the shadcn `Dialog`.
- Semantic tokens only; no data/schema changes.
