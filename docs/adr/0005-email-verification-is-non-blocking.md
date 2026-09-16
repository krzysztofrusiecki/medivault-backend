# Email verification is a non-blocking flag, not a login gate

Status: accepted

`User.emailVerified` records whether a sign-up email was confirmed, but an unverified user can sign in and use the app normally — verification is surfaced as a flag, not enforced as a login precondition. We considered the conventional pattern (block sign-in, or block specific actions, until verified) but rejected it: this is a portfolio demo meant to be tried immediately by reviewers who won't have access to whatever inbox they signed up with, and a hard block would make the live deployment unusable to the one audience it exists for. Revisit if this ever needs to behave like a real product with real user accounts rather than a demo — a hard or partial gate (e.g. blocking lab-result-sensitive actions only) would be the natural next step.
