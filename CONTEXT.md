# MediVault

Backend for collecting, managing, and analyzing laboratory test results — patients track health metrics over time via lab-verified or self-reported data.

## Language

**Analyte**:
A measurable lab value type (e.g. "Prolactin", "Glucose").

**TestBatch**:
A group of `TestResult`s reported together, tied to a single sample date and a single lab (registered or self-reported). Every `TestResult` belongs to exactly one `TestBatch`. Carries an acceptance `status`: `PENDING_ACCEPTANCE`, `ACCEPTED`, or `DECLINED`.
_Avoid_: Panel, order, report

**Lab**:
A registered laboratory organization with its own `LAB_ADMIN` accounts, created by a `SUPER_ADMIN`. A `TestBatch` may instead carry a free-text lab label when the lab isn't registered — a batch has one or the other, never both.

**LAB_ADMIN**:
A user role representing staff at exactly one registered `Lab` (one lab per admin, not many-to-many). Attached to a `Lab` by a `SUPER_ADMIN` — cannot self-register a `Lab`, and cannot invite other `LAB_ADMIN` staff themselves. Attachment is a manual `SUPER_ADMIN` action against an existing account, not a self-service invite flow — see [ADR-0002](docs/adr/0002-lab-staff-attached-manually-by-super-admin.md).

**Lab-verified batch**:
A `TestBatch` created by a `LAB_ADMIN` for an existing patient, found by email lookup — the patient must already have a MediVault account (see [ADR-0001](docs/adr/0001-lab-verified-batches-require-existing-account.md)). Starts `PENDING_ACCEPTANCE`; the patient accepts or declines it from their own account.
_Avoid_: Verified batch, official batch

**Self-reported batch**:
A `TestBatch` created directly by the patient (`USER`), using a free-text lab label — includes the auto-created one-off batch from ad-hoc single-result entry. Always starts `ACCEPTED` — there's no one else to confirm it.
_Avoid_: Manual batch, patient batch

**Declined batch**:
A lab-verified `TestBatch` the patient rejected (e.g. a wrong-patient email match). Kept, not deleted — stays visible as an audit trail for the `LAB_ADMIN`/`SUPER_ADMIN`.
