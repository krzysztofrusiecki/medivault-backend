# Reference range matching happens client-side; the API never computes or snapshots a status

Status: accepted

`ReferenceRange` rows (bounds plus optional `gender`/age band, labeled per band) are served as-is via the API for a given `Analyte` — the backend performs no comparison against `TestResult.value` and stores no computed status (e.g. LOW/NORMAL/HIGH) anywhere. Picking which band applies to a specific patient and result (matching on gender and age-at-`sampleDate`) is left entirely to the frontend.

This deliberately departs from the existing `AnalyteUnit` precedent, where the backend snapshots computed values (`factorSnapshot`/`offsetSnapshot`) onto `TestResult` at creation time so historical data doesn't drift if a conversion factor later changes. We considered doing the same for reference ranges — snapshotting the matched band onto `TestResult` — but rejected it: range edits are rare (on the order of once a decade per analyte), so drift risk is negligible, and pushing matching to the frontend avoids duplicating age/gender lookup logic and a status-computation pipeline in the backend for a comparison the client already has all the inputs for. Revisit if per-`Lab` ranges (a planned future extension that would shadow the global range) make matching ambiguous enough to need a canonical, backend-computed answer.
