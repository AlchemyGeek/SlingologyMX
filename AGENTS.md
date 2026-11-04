# Architecture rules
- Oil Analysis is an aircraft-owned log with nullable metrics and explicit detection-limit qualifiers; missing values never imply zero.
- Oil PDF extraction runs in the dedicated edge function using streamed Responses and strict structured output; report bytes are never written to storage.
- Oil report dates use the extraction function's shared calendar-validating normalizer on both server and browser, avoiding locale-dependent parsing and invalid Date values.
- Built-in engine guidelines is opt-in per sample and separate from the issuing laboratory's limits, so different engines are not assessed against Rotax thresholds automatically.
- Oil samples participate in the existing backup pipeline after maintenance records, with fresh IDs, remapped maintenance links and aircraft-scoped duplicate detection.