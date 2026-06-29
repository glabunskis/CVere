---
name: create-phased-plan
description: Research a goal and write a uniform, phase-independent, handover-aware plan into .cursor/plans for execution by a lower-reasoning model. Use to turn a goal into a detailed phased plan.
---

# Create a phased plan

Turn the provided goal into a detailed, uniform plan saved in `.cursor/plans/`,
structured so each phase can later be executed independently in a fresh context
window by a lower-reasoning model.

The plan format is defined in @.cursor/commands/PLAN-FORMAT.md. Read it first and
follow it exactly.

## Input

The goal is `$ARGUMENTS`.

If `$ARGUMENTS` is empty, missing, or too vague to act on, STOP and ask the user
for the goal before doing anything else. Do not guess a goal.

## Mode

This command produces a plan only. Recommend the user run it in Plan mode. Even
in Agent mode, do NOT modify source code or run any non-readonly command. The
only file you write is the plan markdown under `.cursor/plans/`.

## Workflow

1. Restate the goal in your own words to confirm understanding.
2. Research before planning:
   - Explore the relevant parts of the codebase (use parallel exploration where
     possible) and gather exact file paths, current behavior, and constraints.
   - Confirm facts; do not assume. If something cannot be confirmed, record it as
     an explicit unknown in the plan's Context section.
3. Clarify with the user:
   - Whenever the goal is ambiguous, has multiple valid approaches with real
     trade-offs, or the scope is broad, ask 1-2 critical questions at a time
     using the questions UI. Recommend an option when you have one.
   - Resolve ALL architecture- and scope-level ambiguity now. The executor of a
     phase must never have to make a design decision; every such decision belongs
     in the plan's "Decisions already made" section.
4. Decompose into phases:
   - Enforce the phase-independence rule from the format file: each phase must be
     implementable in isolation given only the repo state after earlier phases
     plus the handover log. No forward dependencies. Merge mutually dependent
     work into one phase.
   - Keep each phase small enough for one fresh-context session, but always
     leaving the repo buildable.
   - Order phases so each depends only on earlier ones.
5. Write the plan:
   - Follow @.cursor/commands/PLAN-FORMAT.md for location, frontmatter, section
     order, per-phase structure, and the handover log.
   - Audience is a lower-reasoning executor: be explicit and unambiguous, name
     exact files/functions/components/props, and describe placement of changes.
   - Include NO code snippets anywhere in the plan. Describe the change, the
     target, and the resulting behavior in prose.
   - Make `todos` in frontmatter match the phases exactly (one per phase, same
     order, ids `phase-<n>-<shortname>`, all `pending`).
   - Seed an empty Handover log containing only the template reminder.
6. Save to `.cursor/plans/<kebab-slug>.plan.md` (slug derived from the goal).
7. Report: the saved path and a short numbered summary of the phases. Do NOT begin
   implementing any phase.

## Stop conditions

- Stop and ask if the goal is missing or unclear.
- Stop and ask before proceeding whenever a design decision would otherwise be
  left for the executor.
