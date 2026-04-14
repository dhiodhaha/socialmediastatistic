# AGENTS.md

## Purpose

This file stores durable working rules for agents operating in this repository.
It should contain stable collaboration constraints, architectural preferences, and repo-specific execution rules.

It should not be used as a temporary task log.

## Repository Working Rules

1. Use DDD and feature-based structure that matches the existing repo layout.
2. Prefer SRP modules with small, focused responsibilities.
3. Every new feature or change must be done on a new branch.
4. Every PR must include a description with:
   - summary
   - scope
   - verification
   - related issue(s) when applicable
5. Do not mix unrelated local tool or skill files into feature branches or PRs.
6. Keep monthly reporting behavior stable unless the current issue explicitly changes it.
7. For Next.js server action files, export async server actions only. Move reusable sync helpers into plain lib modules.

## What Belongs In This File

Add items here only if they are durable and likely to matter across future sessions, such as:

- repo-wide architecture rules
- branching and PR workflow rules
- stable module-boundary constraints
- persistent product constraints that affect implementation
- repeat mistakes that should be prevented in future work

## What Should Not Be Inserted Here

Do not put these into this file:

- temporary progress updates
- daily work logs
- issue-by-issue implementation status
- commit hashes
- PR numbers unless they establish a long-lived policy
- brainstorming notes
- one-off debugging context
- local environment noise such as untracked skill folders

## Current Durable Product Constraints

- The app is government-first today.
- Quarterly reporting is being added without breaking the existing monthly flow.
- The exported PDF is the primary product output; the app is the internal preparation and review tool.
- Quarterly preview should stay platform-first in-app.
