# Development Logging

## Location

Daily development logs are stored in `dev-logs/`.

Use this filename format:

```text
YYYY-MM-DD.md
```

Example:

```text
dev-logs/2026-06-11.md
```

## Required Sections

Each daily log should include:

```markdown
# Development Log - YYYY-MM-DD

## Completed

- ...

## Decisions

- ...

## Todo

- ...
```

## Update Timing

Update the daily log:

- After meaningful implementation work.
- After product or design decisions.
- Before ending a development session.
- When a blocker or important risk is discovered.

## Automation Expectation

This project expects daily logging to be maintained automatically by the assisting AI agent whenever it performs project work. If the project later adds scripts or CI, daily log creation can be automated with a local script, but the minimum requirement is that every agent session updates the relevant daily log.
