# Oil Analysis
- [x] Prevent repeated compliance History entries on unchanged saves; seven regression tests passed and an unchanged save of the affected bulletin's maintenance record kept the History count at three; existing audit records preserved.
- [x] Improve engine serial extraction and aircraft equipment correlation; equipment selector verified signed-in without changing existing samples. Actual report extraction awaits a supplied PDF.
- [x] Aircraft-scoped records, optional maintenance link, manual entry and review.
- [x] Transient, lab-agnostic PDF extraction with safe error handling.
- [x] Trends, normalized statistics, and reference-based health checks.
- [x] Backup schema 2.1 and backward-compatible export/import.
- [x] Tests and signed-in desktop/mobile verification; synthetic lab PDF extraction and backup round-trip passed.
- [ ] Validate actual laboratory layouts — waiting for user-supplied Blackstone and other lab PDFs.