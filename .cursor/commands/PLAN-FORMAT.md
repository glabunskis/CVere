---
name: plan-format
description: Canonical plan-file contract shared by /create-phased-plan and /execute-phase. Defines location, frontmatter, body sections, self-contained phase structure, the phase-independence rule, and the handover log template. Reference file, not a directly invoked command.
disable-model-invocation: true
---

# Phased Plan File Format

This is the single source of truth for the structure of every plan produced by
`/create-phased-plan` and consumed by `/execute-phase`. Do not invoke this file
on its own. Both commands `@`-reference it so the format stays consistent.

A conforming plan is optimized for a **lower-reasoning executor running each
phase in a fresh context window**. That means: be explicit, remove ambiguity,
cite exact file paths, and never assume the executor remembers anything except
what is written in this plan and its handover log.

## 1. Location and naming

- Save plans at the workspace-root `.cursor/plans/<kebab-slug>.plan.md` (for
  example `<workspace-root>/.cursor/plans/`), NOT the global user store at
  `~/.cursor/plans/`.
- Create the file with the `Write` file tool using the kebab-slug filename. Do
  NOT use the `CreatePlan` tool to satisfy this contract: it writes
  `<name>_<hash>.plan.md` into the global `~/.cursor/plans/` store instead of the
  workspace folder.
- Derive `<kebab-slug>` from the goal (lowercase, words separated by hyphens,
  no spaces, no punctuation). Example goal "Add framer motion animations" ->
  `.cursor/plans/add-framer-motion-animations.plan.md`.
- If a file with that slug already exists, append a short disambiguating suffix
  (for example `-v2`) rather than overwriting.

## 2. Frontmatter (YAML)

Every plan starts with a YAML frontmatter block containing exactly these keys:

- `name`: human-readable plan title.
- `overview`: one or two sentences describing the whole plan.
- `todos`: a list with **exactly one entry per phase**. Each entry has:
  - `id`: `phase-<n>-<shortname>` (for example `phase-1-foundation`).
  - `content`: one-line description of that phase.
  - `status`: one of `pending`, `in_progress`, `completed`.
- `isProject`: `false`.

The `todos` list must stay in sync with the `## Phase N` sections in the body:
same count, same order, matching ids.

## 3. Required body sections (in this exact order)

1. `## Goal` - one short paragraph stating the end state.
2. `## Context / key facts` - confirmed facts the executor needs, each with
   exact file paths. Capture anything discovered during research so the executor
   does not have to rediscover it. Mark unknowns explicitly as unknown.
3. `## Decisions already made` - every architecture-, scope-, or
   approach-level choice, resolved. The executor must never have to choose
   between competing approaches; decide here and record the decision.
4. `## Conventions` - rules the executor must follow in every phase: build/lint/
   test commands to run, framework/style rules, import rules, and any
   project-specific constraints. (Note: the "no code snippets" rule applies to
   writing the plan, NOT to the executor, who writes real code.)
5. `## Phases` - the numbered phases (see section 4).
6. `## Out of scope` - explicit exclusions, so the executor does not expand
   scope.
7. `## Handover log` - the living log (see section 5). Starts empty except for
   the template reminder.

## 4. Phase structure (each phase fully self-contained)

Each phase is a `## Phase N - <name>` heading followed by these labeled parts:

- `Status:` one of `pending`, `in progress`, `done`. New plans set all to
  `pending`.
- `Objective` - what this phase delivers, in one or two sentences.
- `Files to touch` - exact paths to create or edit. List every file.
- `Steps` - detailed, numbered, explicit instructions. Describe what to change,
  where, and the resulting behavior. **No code snippets** - prose only. Be
  precise enough that a low-reasoning model cannot misinterpret (name the
  function, component, prop, section, or symbol; describe placement).
- `Verification` - concrete acceptance checks the executor must pass before
  marking the phase done (commands to run such as `npm run build` / `npm run
  lint`, and observable behavior/UI to confirm).
- `Dependencies` - what prior phases or pre-existing repo state this phase
  relies on. Reference ONLY earlier phases or existing state. Never reference
  work from a later phase. Restate the relevant prior-phase outputs explicitly
  so this phase can start from a cold context.

### Phase-independence rule (hard requirement)

Phases must be orderable, and each must be implementable in isolation given only
(a) the repo state after all earlier phases completed, and (b) the handover log.
No phase may require knowledge of, stubs for, or coordination with any later
phase. If two pieces of work are mutually dependent, merge them into one phase.

Keep phases small enough to complete in a single fresh-context session, but each
must leave the repo in a coherent, buildable state.

## 5. Handover log

A living, append-only section at the end of the plan. It is the only memory the
next fresh-context executor has about what already happened. New plans seed it
with the template below and nothing else.

Append one entry per completed phase, using this fixed template:

```
### Phase <N> handover - <completion timestamp>
- Implemented: <summary of what was done + key files actually changed>
- Current state: <repo/app state now relevant to the next phase>
- Decisions / deviations: <any deviation from the plan and why; "none" if none>
- Gotchas: <surprises or pitfalls the next executor must know; "none" if none>
- Next entry point: <exact place/phase the next executor should start>
- Verification: <build/lint/test results, e.g. "npm run build passed">
```

Do not edit or delete prior handover entries; only append.
