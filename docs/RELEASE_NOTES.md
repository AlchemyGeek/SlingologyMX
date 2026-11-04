# SlingologyMX Release Notes

## v26.11.01 — Improvements since v26.08.01

**Release statement date:** November 4, 2026  
**Scope:** Cumulative improvements after v26.08.01, through v26.11.01. This is an application version; the current backup format is **2.1**.

SlingologyMX now offers a clearer Tach-driven counter experience, better maintenance planning, more accurate ownership forecasts, richer equipment records, external integrations, and a new Oil Analysis log. The improvements below describe the current application, not a guarantee that the published website has already been updated.

### Aircraft counters: fewer inputs, clearer readings

- Tach is the primary reading. Airframe, Engine and Propeller total time advance with Tach rather than being independently maintained.
- Owners who track only Tach can hide Hobbs throughout the dashboard, maintenance forms and counter selectors. Hobbs mirrors Tach in the background when linked.
- The home-page counter header gives Tach and optional Hobbs prominent instrument-style displays, with smaller derived component totals underneath. Tach is labeled **Primary**.
- Engine and propeller overhaul/replacement entries record the date, Tach at installation and starting component hours. Starting hours default to zero but can represent a used component.
- Overhaul confirmation requires typing **RESET**. Airframe total time cannot be reset.
- Existing maintenance readings and counter-history snapshots remain intact; historical records are not recalculated under the new model.
- Updating a maintenance record only offers to advance aircraft counters when its readings exceed the aircraft's current readings—not merely the previous version of the record.
- Aircraft profiles now include a serial number beneath model/make, while the header aircraft selector displays the registration without the model.

### Maintenance planning and time in the shop

- Maintenance records now have a required **Date Started** and an optional **Date Completed**, supporting future jobs, work in progress and completed work.
- Maintenance status and shop duration distinguish Scheduled, In Progress and Completed jobs.
- Completed jobs require usage readings; future or in-progress jobs can be saved without those readings.
- Future-start maintenance creates a reminder even when a planned completion date is entered.
- The Timeline shows maintenance duration, including open-ended work in progress, without drawing the generated reminder as a duplicate event.
- Upcoming maintenance items in the Timeline open the underlying maintenance record.
- Editing maintenance financial details preserves the linked transaction's existing status rather than changing Posted transactions back to Pending.

### Timeline, Calendar and History

- A Timeline view brings together Maintenance, Directives, Financial, Counters and Other events.
- General reminders such as training renewals appear in the **Other** lane rather than being classified as Maintenance.
- Screens too narrow for the Timeline open on Calendar instead. Timeline remains available with its larger-screen notice.
- History includes Posted financial transactions alongside aircraft activity.
- Maintenance history respects start/completion dates and distinguishes work in progress from completed work.

### Notifications and dates

- Custom calendar recurrence supports intervals such as **every 3 years** or **every 4 months**, with day, week, month and year units.
- Calendar projections and completing a recurring reminder use the custom interval to calculate the next occurrence.
- Date fields accept both two-digit and four-digit years. For example, `2/1/27` means February 1, 2027; two-digit years map to 2000–2099.
- The header reminder bell highlights overdue or unconfirmed reminders and Pending transactions, with snooze and navigation to the relevant lists.

### Financial records and more accurate insights

- New transactions default to **Operation** intent and **Fuel** category.
- Cost-allocation methods have inline explanations; Custom allocation displays both start and end dates.
- Analysis settings explain Cash Flow, Ownership Total and Cost-Per-Hour inclusion. What Happened continues to list every Posted transaction regardless of these switches.
- True Cost and Cost Structure respect **Include in Ownership Total**. Outlook's historical variable-cost estimates respect **Include in Cost-Per-Hour**.
- One-time upgrades can remain visible in What Happened while being excluded from those other analyses.
- Maintenance labor, parts and related maintenance categories are consolidated into a **Maintenance** bucket in insight breakdowns.
- Maintenance is treated as variable rather than fixed in the cost structure, and recurring maintenance is not double-counted in generic historical forecasts.
- Outlook does **not** extrapolate unscheduled maintenance. Scheduled maintenance forecasts come from recurring jobs and their hour-based or calendar-based due points and recorded costs.
- Fuel, oil and travel forecasts retain recent per-hour estimates.
- Commitments active at the forecast start are assumed to renew at the current rate when their end date falls within the forecast, rather than stopping insurance and similar recurring costs partway through the forecast window.

### Equipment inventory

- Equipment records now include **Software Version**.
- Equipment can be archived instead of deleted, retaining it for reference. Archived equipment is hidden by default and can be revealed with **Show archived**.
- Archived equipment is excluded from new equipment selections; existing directive links remain available. Active linked reminders are completed when equipment is archived.
- Equipment can be cloned. The copy retains the equipment details, receives **TBD** as its serial number and starts unarchived.

### New Oil Analysis log

- Aircraft-owned oil sample records support manual entry and optional links to maintenance records.
- Laboratory PDFs can be scanned into an editable review form. Saving remains a separate, explicit action.
- Scanned PDFs are processed transiently and are not retained as stored attachments.
- Records capture laboratory/report identity, engine model and serial, oil and engine hours, oil grade, fuel type, make-up oil, laboratory comments and notes.
- Twenty elemental measurements and nine physical-property/contamination measurements are supported, along with laboratory averages, printed ranges and additional report-specific results.
- Missing measurements stay empty rather than becoming zero. Detection limits retain qualifiers such as `<0.5`.
- Trends support measured values and per-oil-hour normalization, filtering by engine identity, and summary statistics.
- Assessments distinguish laboratory limits from an optional Rotax 916 iS advisory profile; the profile is not automatically applied to other engines and is not an airworthiness determination.
- The list header includes the latest sample's recorded hours under **Tach at Latest Sample**, alongside the sample date, oil interval and assessment.
- Engine serial extraction now explicitly checks alternate report labels. Engine equipment can supply missing identity details for review without replacing values printed in the report; automatic suggestions require a unique matching installed engine.
- Engine serials are visible in the header/sample details and searchable.
- AI scanning has bounded retries for transient failures and stops on access or credit-policy blocks instead of repeatedly retrying.

### External integrations

- Aircraft-scoped API keys are managed centrally in **Profile → Integrations**, including aircraft selection when generating a key and improved key copying.
- The transaction ingest endpoint accepts third-party expenses, including Ramp-origin transactions, with external-reference duplicate protection.
- Deleting an imported transaction allows it to be imported again using the same external reference.
- A separate counter ingest endpoint updates aircraft counters and counter history, validates readings and follows the Tach-derived model.
- Integration documentation describes the separate transaction/counter endpoints, request fields, authentication and response handling.

### Backups and portability

- The current JSON export/import schema is **2.1**, with compatibility upgrades for earlier supported backups.
- Backups include aircraft identity and operational counter settings, overhaul details, equipment archive/software fields, maintenance start/completion dates, transaction external references and custom notification recurrence.
- Oil samples are included in JSON and Excel exports. Import generates fresh IDs, remaps maintenance links and checks for aircraft-scoped duplicate samples.
- Export displays the current backup schema; import preview displays the selected file's schema and whether it will be upgraded.
- Excel exports use readable record references rather than exposing raw relationship IDs as the primary presentation.
- README and functional documentation were expanded to cover the application's capabilities and integrations.

### Phone usability

- Removed forced wide layouts and improved counter/chart presentation on small screens.
- Transactions, directives, notifications and related-record lists use phone-friendly card layouts where appropriate.
- Phone actions use compact icons, and record-creation controls use a **+** icon.
- Improved touch targets, decimal-entry fields, safe-area spacing and stacked insight layouts.

### Reliability, account management and security

- Corrected selected table-access permissions affecting shared service bulletins, feedback, profile creation and logged-out signup settings.
- Tightened shared-bulletin ownership and maintainer feedback-update scope without removing the intended public signup-setting access.
- Corrected administrator password-setting, suspension and deletion authorization checks.
- Generated passwords now satisfy the application's length and character requirements, and password-setting errors are surfaced more clearly.
- Reviewed and addressed the specifically selected security findings; these notes do not claim that every scan finding has been resolved.

### Availability and boundaries

- The home page includes the April 2026 availability update: MX is no longer publicly available, continues to be developed for private use, and its source is available for self-hosting on GitHub.
- General receipt/invoice OCR and Google Drive receipt storage were discussed but are **not included** in this release. PDF scanning currently applies to Oil Analysis.
- Real laboratory layouts still require additional validation using actual report PDFs; synthetic extraction and signed-in equipment selection have been checked.
- The previously discussed automatic stale-cache recovery changes are not included in this release statement.
- SlingologyMX remains an owner planning and analysis tool, not a replacement for official maintenance records or a determination of airworthiness.