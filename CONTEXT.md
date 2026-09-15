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

**ReferenceRange**:
A labeled band of `minValue`/`maxValue` (in the `Analyte`'s canonical unit) for a `NUMERIC` `Analyte`, optionally scoped to `gender` and/or an age band (`minAge`/`maxAge`), authored by `SUPER_ADMIN`. An `Analyte` may have several bands (e.g. "Deficient"/"Insufficient"/"Sufficient"/"Toxic" for Vitamin D3). The API serves all bands for an `Analyte` as-is; matching a `TestResult` to the applicable band is a frontend concern — see [ADR-0003](docs/adr/0003-reference-range-matching-is-client-side.md).
_Avoid_: Normal range, threshold, panic value

**Session**:
The continuous lineage of one login, identified by a stable `familyId` that survives every token rotation. A user may hold several concurrent `Session`s (e.g. phone and laptop, each its own login). `POST /auth/logout` identifies the `Session` to end from the presented refresh cookie (not from the access token, which carries no session identity) and revokes only that one — not the user's other `Session`s — see [ADR-0004](docs/adr/0004-refresh-tokens-are-db-backed-rotated-per-session.md).
_Avoid_: device, token family (implementation detail, not user-facing)

**RefreshToken**:
A DB-backed, hashed, single-use credential belonging to a `Session`, exchanged for a new access token at `POST /auth/refresh`. Rotated on every use — the presented row is marked used and replaced by a new one sharing the same `familyId`. Presenting an already-rotated row revokes the entire `Session`, not just that row. Delivered as an httpOnly cookie scoped to `Path=/api/auth` (reaches `/auth/refresh` and `/auth/logout`, nothing outside auth routes).
_Avoid_: refresh JWT (it's an opaque random string, not a JWT)
