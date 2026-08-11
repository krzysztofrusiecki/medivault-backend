# Issue tracker: Linear

Issues and specs for this repo live in Linear, under the **MV** team (MediVault). Commit messages and PR titles already reference issues this way — e.g. `feat(MV-10): enable CORS configuration`, `feat(MV-8): Add numeric and text test result creation with unit tests`.

## Conventions

- **Create an issue**: use the Linear MCP/API integration to create an issue under team **MV**. Set title, description, and any relevant labels.
- **Read an issue**: fetch the issue by its identifier (e.g. `MV-10`) via the Linear MCP/API integration, including its description and comments.
- **List issues**: query Linear for issues under team **MV**, filtering by state/label as needed.
- **Comment on an issue**: add a comment via the Linear MCP/API integration.
- **Apply / remove labels**: update the issue's labels via the Linear MCP/API integration.
- **Close / resolve**: transition the issue to its "Done" (or equivalent terminal) state via the Linear MCP/API integration.

If no Linear MCP server or API integration is configured in the current session, say so explicitly rather than guessing — don't fall back to drafting markdown unless asked.

## Referencing issues in commits and PRs

Reference the Linear identifier in commit messages and PR titles, following the existing convention: `<type>(MV-<number>): <short description>`.

## When a skill says "publish to the issue tracker"

Create a Linear issue under team **MV**.

## When a skill says "fetch the relevant ticket"

Look up the issue by its `MV-<number>` identifier in Linear.
