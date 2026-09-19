# Decision Workflow

Log a decision with WHY and tradeoffs ENFORCED. Adapted from Avada's avader-folder `/decision` skill: a decision without a real why and a real tradeoff does not get saved.

## Configuration

```
VAULT_PATH: load from ../CONFIG.md (single source of truth)
FOLDER: {VAULT_PATH}/2. Notes/Decisions/
TEMPLATE: {VAULT_PATH}/5. Resources/Templates/decision.md
```

## When to use

- The user just made (or is about to make) a meaningful choice: pivot direction, pick a vendor/tool/stack, kill or keep a feature, change a strategy.
- Log BEFORE acting when possible — the decision record is the input to action, not the postmortem.
- Also fires when the user narrates a decision in passing ("we decided to…", "I'm going with…") — offer to log it.

## Procedure

### Phase 1 — Interview (ONE question at a time, never batched)

The point is to make the user think, not to fill a form fast. If the conversation already contains an answer, propose it for confirmation instead of re-asking.

1. **Decision** — one imperative sentence. ("Kill the marketer-content spine for Craftboard.")
2. **Context** — why does this decision exist now? (3-5 sentences)
3. **Why this option** — why this and NOT the alternatives? (3-5 bullets)
4. **Alternatives considered** — 1-3 rejected options, each with the rejection reason.
5. **Tradeoff accepted** — what is lost by choosing this?
6. **Reversibility** — one-way door (hard to undo) or two-way door (cheap to revert)?
7. **Owner + date** — default: Dylan, today.

### Phase 2 — ENFORCE (hard gate, no exceptions)

- WHY empty, circular ("because it's better", "it makes sense"), or restating the decision → REFUSE to save. Say what's missing and ask again.
- Tradeoff empty or "there's no tradeoff" → REFUSE to save. Every real decision costs something; help hunt for it (time, money, optionality, focus, relationship, technical debt) but do not invent it for the user — they must own it.
- The user can override only by explicitly saying they want it saved incomplete — then save with a `⚠ INCOMPLETE — missing {why|tradeoff}` marker in the body.

### Phase 3 — Write

1. `review_date` = today + 3 months. `status: active`.
2. Slugify title → `{FOLDER}/YYYY-MM-DD-{slug}.md`, fill TEMPLATE.
3. Connections pass (same as Save.md Phase 2/3): map Telos IDs, grep vault for related notes, wikilink up to 5.
4. Update daily note + sources index per Save.md Phase 4.

### Phase 4 — Confirm

Report: file path, reversibility, review date. Mention that `/lint` (vault health) surfaces decisions whose review date has passed.

## Review pass (when Lint or the user surfaces a due decision)

Open the file, ask: did this age well? Fill `## Review` with keep / revise / reverse + one line of evidence. Update `status` (`reviewed`, `superseded`, `reversed`) and, if superseded, wikilink the successor decision.
