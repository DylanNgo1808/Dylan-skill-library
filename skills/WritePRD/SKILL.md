---
name: WritePRD
description: "Summarizes a completed alignment (usually a GrillMe session) into a Product Requirements Document — the 'destination document' for a feature. Based on Matt Pocock's 'write a PRD' workflow. The PRD is NOT specs-to-code: it keeps the code in mind by naming the deep modules to create/modify. It is a SUMMARY of the shared design concept, nothing more — do not over-polish it, and the user need not read it (alignment already happened during grilling; this just checks the model's summarization). Template sections: Problem Statement, Solution, User Stories (Gherkin-friendly), Implementation Decisions, Testing Decisions, Proposed Modules to Modify, and Out of Scope (which doubles as the definition of done and preserves negative decisions). Writes to a local markdown file (default issues/ dir) or a GitHub issue if the user uses issues. USE WHEN write a PRD, write prd, create a prd, product requirements, destination document, turn this into a prd, spec this out, document the feature. NOT FOR breaking the PRD into implementation tickets (that's a separate prd-to-issues step), and NOT FOR the alignment interview itself (run GrillMe first)."
---

# WritePRD — The Destination Document

A PRD here is the **destination**: where the feature is going. It is a *summary of the design concept* already reached during alignment — not a fresh act of design, and not a specs-to-code compiler. The code stays in mind the whole way through.

Run this **after** a `GrillMe` session. (You can run it standalone, but then grill briefly first to reach alignment.)

## Workflow

### 1. Confirm the source of alignment

Ideally you're continuing from a GrillMe conversation — use it directly as the input. If not, ask the user for a long, detailed description of the problem, and run a short grilling pass to fill gaps before writing.

### 2. Explore the code (if fresh)

If this is a new session, delegate a quick repo exploration to a subagent — enough to name the real modules, services, and schema the feature will touch. You need this for the "Proposed Modules" section. This is what keeps it from being specs-to-code.

### 3. Propose the modules first

Before writing the doc, surface the set of modules you intend to create or modify and confirm them with the user. Favor **deep modules** (small interface, lots of functionality inside) over shallow ones — they're more testable and AI works better against them. Get a quick yes on the module map.

### 4. Write the PRD from the template

Fill this template (shape is flexible — match the user's company style if they have one):

```markdown
# PRD: <feature name>

## Problem Statement
The problem the user is actually facing, in plain terms.

## Solution
The approach you're taking to solve it.

## User Stories
The core of the doc. Gherkin / Cucumber style is welcome:
- As a <role>, when <event>, I <outcome>.
(There may be many — 15-20 is normal for a real feature.)

## Implementation Decisions
Concrete choices settled during alignment — thresholds, sources, formats, defaults.

## Testing Decisions
What gets tested and how. Name where the meaningful logic lives and deserves coverage.

## Proposed Modules to Modify
The code map. Deep modules to create or change:
- <new-service> (NEW deep module — interface: <one line>)
- <existing-service> (modified — what changes)
- <route / UI surface> (modified)

## Out of Scope
What we explicitly decided NOT to do, and why. This is the definition of done.
Preserve negative decisions here so they aren't relitigated later.
```

### 5. Save it

- **Default:** write to a local markdown file in an `issues/` directory at the repo root (create the dir if missing). Name it descriptively, e.g. `issues/gamification-system.md`.
- **If the user uses GitHub issues:** create it as an issue instead. (Confirm before creating anything remote.)
- Always confirm the destination before writing remote artifacts.

## Rules

- **It's a summary, not new design.** All the thinking happened in grilling. You're just writing it down.
- **Keep the code in mind.** The "Proposed Modules" section is mandatory — it's what separates this from specs-to-code.
- **Don't over-polish.** No optimization passes to chase the "perfect PRD." The real value is in QA later, not here.
- **The user need not read it.** If alignment was real, this is just checking summarization — and models are great at that. Don't force a review.
- **Out of Scope = definition of done.** Always include it; it's also where negative decisions live.
- **Prefer deep modules.** Small interface, deep functionality. Flag shallow-module sprawl if you see it.

## Gotchas

- **Doc rot:** a PRD that lingers after the feature ships will mislead future agents. Recommend the user delete it (or close the issue) once implementation is done — let the code be the source of truth.
- Don't silently create GitHub issues if the user expected local files. Confirm the destination.
- If the module map feels horizontal (all-schema, or all-UI), push back toward modules that support thin vertical slices of functionality.
