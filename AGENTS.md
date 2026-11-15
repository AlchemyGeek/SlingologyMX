# Architecture rules
- Both compliance forms use the shared compliance-change predicate for history and reminder processing; unchanged saves and notes-only edits must not create additional compliance occurrences.
- Oil Analysis is an aircraft-owned log with nullable metrics and explicit detection-limit qualifiers; missing values never imply zero.
- Oil PDF extraction runs in the dedicated edge function using streamed Responses and strict structured output; report bytes are never written to storage.
- Oil report dates use the extraction function's shared calendar-validating normalizer on both server and browser, avoiding locale-dependent parsing and invalid Date values.
- Built-in engine guidelines is opt-in per sample and separate from the issuing laboratory's limits, so different engines are not assessed against Rotax thresholds automatically.
- Oil samples participate in the existing backup pipeline after maintenance records, with fresh IDs, remapped maintenance links and aircraft-scoped duplicate detection.
- Oil engine correlation preserves report identity; only unique installed model matches may supply missing serials, while archived engines match by explicit serial for historical samples.
- Receipt scanning (transactions, maintenance) runs in the extract-receipt edge function, transient like oil PDFs; it only pre-fills form fields for user review and shares the AI pause state with oil scanning.
