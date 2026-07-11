---
name: GrillMe
description: "Relentless alignment interview before any planning or PRD — the first move on almost any feature. Based on Matt Pocock's 'grill me' workflow. Reads the raw input (a Slack message, client brief, meeting transcript, or one-line idea), explores the codebase via a subagent so the main context stays clean, then interviews the user ONE question at a time, each with a recommended answer, walking the decision tree and resolving dependencies until a shared design concept is reached (Frederick Brooks). Surfaces the nasty questions nobody considered (retroactivity, edge cases, scope boundaries). This is a human-in-the-loop phase — it cannot be looped or run AFK. Output is the aligned conversation history itself, which becomes the asset that feeds WritePRD. USE WHEN grill me, grill, align on this, interview me, plan a feature, here's a brief, turn this idea into a plan, before I build, what am I missing, client brief, feature request. NOT FOR writing the PRD itself (use WritePRD after), and NOT FOR implementation (that comes later)."
---

# GrillMe — Alignment Before Planning

The goal is **not a plan**. The goal is a shared design concept — to be on the same wavelength as the user before a single line of spec or code exists. Misalignment is the most expensive failure in AI-assisted work, and this skill exists to kill it early.

This is the first thing you run when handed an idea. It is **human-in-the-loop**. You cannot loop over it, run it AFK, or shortcut it.

## Input

The user passes raw material: a one-line idea, a Slack message, a client brief file, a pasted meeting transcript, or nothing (in which case ask them what they want to build). Treat all of it as a starting point, never as a finished spec.

## Workflow

### 1. Explore first (cheaply)

If this is a fresh session in a codebase, delegate exploration to a subagent so the main context stays clean. Spawn it to map the relevant parts of the repo — the services, modules, schema, and existing patterns the feature would touch — and report back a short summary. Burn the subagent's tokens, not yours.

If there is no codebase (pure idea), skip this.

### 2. Grill, one question at a time

Interview the user relentlessly about every aspect of the idea until you reach a shared understanding. Walk down each branch of the decision tree, resolving dependencies one by one.

**Rules:**
- **One question at a time.** Never dump a list. Wait for the answer before the next question.
- **Always give your recommended answer.** For every question, propose what you'd do and why. Good recommendations let the user just say "yes" and move on.
- **Hunt for the nasty questions.** The ones neither the user nor the client considered. Retroactivity ("there are existing records with timestamps — do we backfill?"). Scope edges. Failure modes. Data migration. Where the UI lives. What counts as done.
- **Let the user interrogate the repo back.** They can ask you questions to deepen their own understanding of the code. Answer them.
- **Keep the user in the loop, fast.** Short, sharp questions they can answer quickly. Don't make them go check Twitter while they wait.

### 3. Know when to stop

Grilling can run long — 20, 40, even 80 questions is normal. Keep going until the design concept is genuinely shared: the problem, the solution shape, the user stories, the implementation decisions, the testing approach, and what's explicitly out of scope are all settled.

If the user says to wrap up or pull more weight, batch your remaining recommendations and answer your own open questions with sensible defaults, flagging anything risky.

### 4. Hand off

The output of this skill is **the conversation itself** — the aligned history is the asset. When alignment is reached, tell the user they're ready to run `WritePRD`, which will summarize this into a destination document.

## Rules

- **This is alignment, not documentation.** Don't produce a plan or a doc here. Just reach shared understanding.
- **Recommendations on every question.** No bare questions.
- **One at a time. Always.**
- **Surface what's unsaid.** The value is in the questions nobody thought to ask.
- **Never jump to a plan.** The instinct to "I've got enough, let me plan now" is the exact thing this skill suppresses.

## Gotchas

- If you find yourself eager to summarize or produce a plan mid-grill, stop. That eagerness is the failure mode.
- A meeting transcript with a domain expert is great fuel — feed it in and grill through the assumptions it leaves open.
- If grilling feels too aggressive for a given user, add stop points or batch related questions — but never default to dumping all questions at once.
