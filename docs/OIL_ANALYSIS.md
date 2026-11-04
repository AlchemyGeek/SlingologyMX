# Oil Analysis

Available in Dashboard → Logs → Oil Analysis. App version is unchanged; backup schema is **2.1**.

## Records
Each sample belongs to one aircraft and its owner. Sample date is required; measurements may be absent. Optional maintenance links must belong to that same owner and aircraft. Reports retain laboratory identity, engine model/identifier, oil and engine hours, make-up oil in quarts, oil grade, fuel mix, oil-changed indicator, twenty elemental concentrations (ppm), nine physical properties, laboratory comments, notes, reference ranges and fleet averages. Additional report-specific tests and extraction warnings are retained.

## PDF review
`extract-oil-analysis` authenticates the user, validates aircraft ownership, accepts a PDF up to 10 MB, and uses streamed Lovable AI Responses structured extraction. Files are processed transiently: no storage bucket, PDF attachment, or original document retention. Extracted fields open in the same editable form as manual samples; saving is always a separate user action. Unknown values stay empty. Detection limits such as `<0.5%` retain their qualifier. Temperature conversion to °F is permitted when explicit; viscosity at different temperatures is not silently approximated. If a report includes several samples, extraction selects the latest and warns about unimported columns.

No external Drive integration is included. Gateway usage is billed in workspace credits; previous per-scan dollar estimates are not a guaranteed price.

## Trends and assessment
Charts select any metric, measured value or per-oil-hour normalization, sample date or engine hours, and engine identity. Each laboratory's fleet average and latest report ranges are distinguished from measured readings. Detection-limit readings are excluded from exact numeric statistics. Trends show sample count, mean, latest value and first-to-latest percentage change. Assessments compare earlier samples from the same engine identity only.

Lab ranges apply by default. The optional Rotax 916 iS workbook profile enables watch/action guidance from the supplied workbook, not official manufacturer limits. Stable sample values do not imply airworthiness. Three samples are required for a continuing iron-rise co-trend; two are enough for per-hour changes. Lead rate comparison requires unchanged recorded fuel type. Missing measurements are not zero and an absent applicable reference is “Not assessed.”

## Access and recovery
Authenticated owners have aircraft-scoped CRUD access. Server validation also rejects mismatched aircraft and maintenance owners, including service-role inserts. Lab number/date uniqueness prevents duplicate identified samples. Deletion has the app's 20-second undo window.

Only 429/transient 5xx responses receive bounded backoff, up to three total attempts; long Retry-After delays stop the request. Terminal gateway errors preserve their safe message/status. Provider access denial and workspace credit/policy pause state are stored server-side. An administrator may explicitly clear a restored block through the same authenticated function with `{ "action": "resume" }`, then start a new scan; no automatic retry/probe runs in the background.

## Backups
JSON and Excel exports include oil samples. JSON schema 2.1 upgrades previous formats with an empty oil collection. Import follows maintenance records, generates fresh IDs, remaps maintenance links and deduplicates by aircraft, sample date, laboratory name and report number. Excel uses human-readable OIL IDs and remapped maintenance references.

## Verification
Synthetic alternate-laboratory PDF tested through the signed-in UI: Fe 21, Cu 12, Al 4, Pb 3827, viscosity 12.22, flashpoint 470°F, and fuel `<0.5%` read back correctly. Real Blackstone and other provider PDFs still need user-supplied examples for format-specific verification.