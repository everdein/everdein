# Everdein Profile Agent Guide

## Scope And Content

This repository publishes Matthew Clark's GitHub profile through `README.md`.
Keep it lightweight: approved public copy, links, and assets, with no application
framework or fabricated build gate. Matthew Clark is the professional identity;
@everdein also connects personal interests and reading without turning every
personal surface into recruiting copy.

Preserve current versus historical roles, employer attribution, measured time
periods, and ongoing versus completed work. Verify technical claims against
the linked project's implementation and canonical case study. Distinguish
AI-assisted development from AI features in a product. Never publish private
employer evidence, credentials, or personal financial records.

The approved Brand Library linked from `assets/dark-modern/README.md` owns
current masters; historical asset prose or prompts may describe superseded
designs. Verify the selected revision rather than reviving an older banner.
Keep live-product and GitHub-source artwork paired with their actual links.
Use the stable portfolio resume route rather than duplicating public PDFs.

## Verification

Run `git diff --check`, `node --test tests/profile.test.mjs`, and
`node scripts/check-profile.mjs`. `presence.json` records approved public title,
attribution, and asset/destination pairs. Update it only when those decisions
change. Inspect affected public URLs and rendered profile when publishing;
local structural checks do not establish remote availability or visual quality.
The dependency-free Profile validation workflow checks the same scripts; it is
validation, not a separate profile deployment. No package install is required.
See `docs/validation.md` for verification scope and limitations.

## Delegation

Use subagents for independent, bounded work when doing so would materially
improve speed or quality. Keep small or tightly dependent tasks in the main
agent. Use clear file ownership, avoid duplicate work, and have the main agent
integrate and verify the results. Follow the project's usage budget and
stopping rules. Start with at most two helpers; avoid recursive delegation.

Give each helper a question, scope, evidence requirement, and stopping condition.
Parallel writers need disjoint files or isolated worktrees. The parent owns
integration, verification, and publication; do not concurrently switch branches.

## Completion And Publication

For implementation tasks, verify the intended change, commit only its files,
push, and open a ready pull request. Merge after applicable checks pass, verify
the actual merged content on GitHub, synchronize local `main`, and delete the
completed task's local and remote branches after confirming its merged PR and
head. Preserve unrelated work and active branches; never bypass required checks.
Use configured `GH_TOKEN` first and never print or persist its value.

Read-only reviews, planning, and explicit local-only or draft-only requests
retain their requested scope. LinkedIn, Goodreads, Drive, and other social
updates require user intent for that destination. Report passed, failed,
skipped, or blocked checks and the exact remaining obstacle.
