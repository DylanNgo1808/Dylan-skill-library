# KnowledgeBase — Config (single source of truth)

> Load this FIRST when the skill activates. Every workflow resolves paths against `VAULT_PATH`.
> **If the vault moves, change ONLY this file** — no workflow hardcodes the path anymore.

```
VAULT_PATH: ~/Obsidian/Memories
```

## Folder Map

| Type key | Path (relative to VAULT_PATH) | Use |
|----------|-------------------------------|-----|
| `note` | `2. Notes/Reference/` | general reference, factual content |
| `learning` | `2. Notes/Learning/` | lessons, TIL, how-to |
| `idea` | `2. Notes/Ideas/` | brainstorm, concept, hypothesis |
| `conversation` | `2. Notes/Conversations/` | chat / meeting recap |
| `person` | `2. Notes/People/` | one living file per person (colleague, customer, partner) — filename is the person's natural name (`Sam Nguyen.md`) so `[[Sam Nguyen]]` wikilinks resolve; NO date prefix; template: `5. Resources/Templates/person.md` |
| `decision` | `2. Notes/Decisions/` | decision log — WHY + tradeoff ENFORCED via `Workflows/Decision.md` (never a plain save); template: `5. Resources/Templates/decision.md`; review_date +3 months, `/lint` sweeps overdue reviews |
| `journal` | `4. Journal/` | personal reflection |
| `project` | `3. Projects/{Project}/` | project-specific context — ALWAYS in a project subfolder, never flat (see Project Map below) |
| `resource` | `5. Resources/Clippings/` | web clippings, article saves |
| `synthesis` | `2. Notes/Synthesis/` | concept pages (folder created on first synthesis) |
| `inbox` | `1. Inbox/` | unsorted fallback when type is unclear |
| `daily` | `7. Daily Notes/` | per-day aggregator |
| sources index | `2. Notes/Reference/2026-02-28-sources-index.md` | running index of saves |
| templates | `5. Resources/Templates/` | note templates |
| session queue | `1. Inbox/Session Queue.md` | auto-fed by KnowledgeQueue.hook.ts (Stop hook); processed via Workflows/ProcessQueue.md |
| archive | `6. Archive/` | retired content (e.g. `Telos-2026-02/` — superseded by `~/.claude` TELOS) |

## Project Map

Project notes ALWAYS live one level under `3. Projects/` in a project folder. Resolve the folder from the repo/context via this alias map; create a new folder only for a genuinely new ongoing project (else use `Side-Projects/`).

| Aliases (repo names, spoken references) | Folder |
|-----------------------------------------|--------|
| craftboard, craftboard.ai, helpdesk-docs, help docs, "the canvas app", FIXED. series | `3. Projects/Craftboard/` |
| avada, avada-crm, avada-io, joy, joy loyalty, analytics, nexus, marketing work | `3. Projects/Avada/` (skill AvadaWork owns `projects/` + `archive/` inside; old marketing notes in `Marketing/`) |
| pdf invoice, invoice generator, invoice website | `3. Projects/PDF-Invoice/` |
| lifeos, pai, ~/.claude, hooks, skills, the DA, Albert | `3. Projects/LifeOS/` |
| one-off explorations, unclassified projects | `3. Projects/Side-Projects/` |

## Voice (PAI Pulse)

```
endpoint: http://localhost:31337/notify
voice_id: 21m00Tcm4TlvDq8ikWAM
```
