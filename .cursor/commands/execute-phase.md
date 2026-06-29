---
name: execute-phase
description: Implement exactly one phase of a phased plan, update its handover log, then stop. Use to execute a single numbered phase from a plan in .cursor/plans.
---

# Execute one phase of a plan

Implement exactly ONE phase of an existing phased plan, then stop. Each phase is
designed to run in a fresh context window, so the plan and its handover log are
your only memory of prior work.

The plan format is defined in @.cursor/commands/PLAN-FORMAT.md. Refer to it for
section names and the handover log template.

## Input

`$ARGUMENTS` should contain a plan reference and a phase number (for example:
`add-framer-motion-animations 2`).

- If the plan reference is missing or ambiguous, STOP and ask. Offer to list the
  plans available in `.cursor/plans/`.
- If the phase number is missing, STOP and ask which phase to run.
- Do not assume a default phase or default plan.

## Workflow

1. Read the full plan file. Pay special attention to:
   - `Context / key facts`, `Decisions already made`, and `Conventions` (these
     bind every phase).
   - The target `## Phase N` section (Objective, Files to touch, Steps,
     Verification, Dependencies).
   - The entire `Handover log` - this is the only record of what earlier phases
     actually did.
2. Pre-flight check:
   - Confirm the target phase's `Dependencies` are satisfied per the handover log
     and current repo state.
   - If prerequisites are not met, the phase is unclear, the plan is internally
     contradictory, or reality diverges from the plan, STOP and ask before
     editing anything. Do not improvise around ambiguity.
3. Implement ONLY this phase:
   - Follow the phase `Steps` and the global `Conventions`.
   - Do not start, prepare, or stub any later phase. Stay within the listed
     `Files to touch` unless a step requires otherwise (note any such deviation).
4. Verify:
   - Run the phase `Verification` steps (for example `npm run build` /
     `npm run lint` as defined in the plan).
   - Fix any issues this phase introduced before continuing.
5. Update the plan file:
   - Set the target phase `Status:` to `done`.
   - Set the matching `todos` entry in frontmatter to `completed`.
   - Append one entry to the `Handover log` using the template from
     @.cursor/commands/PLAN-FORMAT.md (implemented / current state / decisions /
     gotchas / next entry point / verification). Append only; never edit prior
     entries.
6. Stop and report:
   - Summarize what this phase changed, verification results, and anything the
     next-phase executor must know.
   - Do NOT continue to the next phase. End the turn.

## Stop conditions

- Stop and ask if the plan or phase number is missing or ambiguous.
- Stop and ask if prerequisites are unmet or anything is unclear or
  contradictory. When in doubt, ask rather than assume.
- Stop after one phase, even if the next phase looks trivial.
