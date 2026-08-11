# Lab-verified batches require an existing patient account

Status: accepted

When a `LAB_ADMIN` creates a lab-verified `TestBatch` for a patient, the patient must already have a MediVault account — the `LAB_ADMIN` looks them up by email, and creation fails if no match exists. `TestBatch.userId` is set immediately (non-null) and the batch starts `PENDING_ACCEPTANCE` until the patient accepts or declines it themselves.

We considered instead letting a `LAB_ADMIN` create a batch for an email with no matching account, claimable later via a one-time human-typeable code (emailed to the patient, or shown to them in person at the lab). That would better serve patients — often elderly — who aren't comfortable registering an account before or during a lab visit. We deferred it: it requires either a nullable `TestBatch.userId` or a separate pending-identity concept, and we chose not to build that into the MVP ownership model. Revisit if guest/no-account patients turn out to be a real population rather than a hypothetical one.
