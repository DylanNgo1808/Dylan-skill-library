---
name: loopgen
description: "Generate a build-loop prompt for ANY project, in that project's own conventions — doctrine pulled live from the project's CLAUDE.md + stack, increments grounded in the project's progress doc. Output is a paste-ready prompt: read the spec, do the next increment, verify, commit, repeat. USE WHEN the user says 'loopgen', 'generate a loop prompt', 'make a build loop', 'loop prompt for', or asks to scaffold a build loop for a feature."
---

# loopgen — project-agnostic build-loop prompt generator

loopgen **authors** a build-loop prompt; you run it. This skill generates the ~80% boilerplate
(doctrine, per-iteration steps, verify gate, branch) correctly for **whatever project you're in**,
so it never drifts from that project's `CLAUDE.md` and stack — you supply only the ~20% that needs
thought (the feature + increments).

A "build loop" here means: a single prompt, re-submitted to Claude Code once per iteration (by
hand, or via any repeat/watch mechanism you have), that always does the same thing — read the spec
doc, pick the next unchecked increment, implement it, verify, mark it done, commit, stop. Re-running
the exact same prompt is what makes it a loop; nothing fancier is required to use this skill.

## Input

```
loopgen [--parallel N] [--branch <name>] [--boundary "<one-line hard rule>"] <feature or goal>
```

- `--parallel N` — draft **N** loop prompts with disjoint file zones, one per contributor/session (default: 1 / single).
- `--branch <name>` — base branch name (default: `feat/<slug-of-feature>`).
- `--boundary "..."` — a HARD BOUNDARY line (e.g. "no schema changes", "read-only until reviewed"). Omit if none.
- everything else — the feature/goal in plain words.

If the feature is empty, show the input line above and stop.

## Step 0 — Resolve project context (do this FIRST, every run)

Never hardcode another project's facts. Detect each slot from the current project:

- **PROJECT_ROOT** — `git rev-parse --show-toplevel` (fallback: cwd).
- **PROJECT_NAME** — `package.json` `name`, else the project-root basename.
- **PKG_MGR** — lockfile wins: `bun.lock`→bun, `pnpm-lock.yaml`→pnpm, `yarn.lock`→yarn, `package-lock.json`→npm. Non-JS: `Cargo.toml`→cargo, `pyproject.toml`/`uv.lock`→uv/poetry, `go.mod`→go.
- **STACK** — from the manifest: framework + language (Next.js/React/Vite/Expo/CLI/library/Rust/Python/Go…). Decides whether there's a dev server + browser verify.
- **DOCTRINE** — regenerate from the nearest `CLAUDE.md` (walk up from cwd to project root): pull its MUST / non-negotiable rules + stack facts. If no `CLAUDE.md`, derive from STACK + the generic baseline below. Never paste another project's doctrine.
- **PROGRESS_DOC** — first that exists: `docs/PROGRESS.md`, `docs/ROADMAP.md`, `TODO.md`, `ROADMAP.md`. If none, ground increments in `git log --oneline -20` + the directory structure, and say so.
- **PORT** — dev server port from the `dev` script / framework default (Next 3000, Vite 5173, Astro 4321, Expo 8081…). No dev server → omit the server half of BRANCH/SERVER.
- **VERIFY_GATE** — build from the project's actual scripts (read `package.json` `scripts`, or the non-JS equivalent): include whichever of typecheck / lint / test / build exist, run via PKG_MGR. Add a browser-render check only for web projects with a dev server — open it and check the rendered page, light + dark if the app themes. Always include "no regression to existing behavior."
- **IMPL_INVOCATION** — how the increment gets implemented: if you have a coding-agent CLI or skill already configured in this project (e.g. a Codex CLI wrapper, `aider`, or your own tool), name its exact invocation so the loop reproduces it verbatim. Otherwise: "implement directly" — Claude writes the code itself. Don't invent a tool that isn't actually configured.

## Steps (do these in order)

1. **Parse** args into `{ parallel, branch, boundary, feature }`. Make a kebab `slug` from the feature.
2. **Read the sources of truth** (only these — never invent scope): the resolved `CLAUDE.md`(s) for DOCTRINE + stack, PROGRESS_DOC for current state (pick the next phase/section and ground increments in what's already done), plus any doc the user names.
3. **Draft the INCREMENTS** — decompose the feature into *smallest shippable slices*, numbered from `0`:
   - `0` is always **"write `docs/<NN>-<SLUG>.md` — spec + this checklist"** so the loop tracks itself there (NOT in PROGRESS_DOC, to avoid clobbering it). Create `docs/` if absent.
   - Each later increment: the exact files, which existing modules/components to reuse, which primitives/deps to add (`→ N` deps), and a one-line acceptance. Favor additive changes, reuse over new, one verifiable thing per increment.
   - **Show the drafted increments to the user and let them edit before emitting the full prompt.** This is the only interactive beat.
4. **Assemble** the prompt from the template below, filling every slot from Step 0.
5. **Output** the prompt in a fenced ```text block (copy-paste ready), preceded by a one-line note on how to run it.
6. **Save it** to a scratch file (e.g. `.loopgen/<slug>/loop.prompt.txt`, gitignored) so it's easy to re-paste each iteration without retyping.

## Template

````text
Build the {PROJECT_NAME} {FEATURE}, ONE increment per iteration. The increment list below + the
named docs + CLAUDE.md are the spec — never invent scope.
{HARD BOUNDARY (non-negotiable): {BOUNDARY} — if any increment seems to require crossing it, STOP and ask.}

CONTEXT: {PROJECT_NAME} at {PROJECT_ROOT}. {one or two sentences of context}
BRANCH{/SERVER}: branch {BRANCH}{; dev server on :{PORT} (browser verify uses http://localhost:{PORT}/...)}.

INCREMENTS (do the first unchecked whose deps are done; mark [~], build, verify, [x], commit):
{INCREMENTS}

PER ITERATION: read docs/{SPEC_DOC}, pick first unchecked, mark [~]; read only what's needed (the
named docs, CLAUDE.md, the file); plan files + modules to reuse; {IMPL_INVOCATION}; VERIFY gate;
mark [x]; commit. Real decision (ambiguous spec, missing dep, external auth, schema/contract
change) → STOP and ask.

VERIFY GATE (all must pass): {VERIFY_GATE}

DOCTRINE (pass to the implementer every time, non-negotiable): {DOCTRINE}

STOP when all increments in docs/{SPEC_DOC} are [x], or when blocked on a decision.
{Never cross the hard boundary — that's a separate, explicitly-approved step.}
````

**How to run it:** paste the prompt into Claude Code once, let it do the first increment, then
re-submit the *same* prompt again for the next increment — it reads its own progress from
`docs/{SPEC_DOC}` each time, so re-pasting is safe and idempotent. Automate the re-submission with
whatever repeat/watch mechanism you already use (a shell loop, a scheduler, a Claude Code loop
feature if you have one installed) — this skill only authors the prompt, it doesn't run the loop.

## Generic doctrine baseline

If the project has no `CLAUDE.md`, synthesize DOCTRINE from STACK + this baseline:

> Use the project's existing package manager (PKG_MGR) — never switch it; match the existing code
> style, structure, and components; reuse before adding; keep the language's strictness (typed/strict
> where supported, no unexplained escapes); smallest shippable slice per iteration; lint + typecheck
> + tests green before "done"; verify real behavior (run it / render it) before claiming done;
> revert any out-of-scope file touched; never commit secrets or keys.

## Parallel mode (`--parallel N`)

Two sessions in one tree collide on git + files. For each of the N loops:

- **Branch:** `{BRANCH}-a`, `-b`, … using worktrees so they don't collide on disk:
  ```bash
  git worktree add -b {BRANCH}-a ../{PROJECT_NAME}-<slug>-a
  git worktree add -b {BRANCH}-b ../{PROJECT_NAME}-<slug>-b
  ```
- **Port:** loop A → base+1, loop B → base+2, … (web projects only).
- **Spec doc:** one per loop (`docs/<NN>-<SLUG>-a.md`, `-b.md`) so they never both edit one file. Tell each loop NOT to touch PROGRESS_DOC mid-run.
- **OWN ONLY zone:** assign each loop a **disjoint** set of files/dirs. Put an `OWN ONLY these files — do NOT touch <other loops' zones>:` block in each prompt right after CONTEXT. Shared files (data layer, app shell, `package.json`, schema/migrations, lockfiles) must be owned by **exactly one** loop; others read but don't edit them — if a loop needs a shared-file change, it STOPS and asks.
- Run each loop in its own terminal tab/pane, in its own worktree. When every loop's checklist is `[x]`, merge each branch into the base branch yourself, in dependency order, resolving conflicts by hand.

There's no built-in supervisor here — for N>1, you (or a session you keep an eye on) are the
manager: check in on each pane periodically, unstick anything idle, and merge when they're done.

## Rules

- **Never invent scope.** The increments + named docs + CLAUDE.md are the spec.
- **Regenerate DOCTRINE and every slot from the *current* project every run.** Cross-project leakage of doctrine/paths is a bug.
- **Smallest shippable slice per increment, one verifiable thing each.**
- **Real decisions stop the loop.** Ambiguous spec, missing dependency, external auth, schema/contract changes — never guess past these.

## Gotchas

- If `docs/` doesn't exist yet, increment 0 creates it — don't create it yourself ahead of time unless you want to pre-seed something.
- A loop that keeps re-picking the same increment usually means the acceptance criterion in the spec doc is too vague to mark `[x]` confidently — tighten it.
- Parallel mode without disjoint file zones is the #1 cause of merge pain — be strict about OWN ONLY assignments up front.
