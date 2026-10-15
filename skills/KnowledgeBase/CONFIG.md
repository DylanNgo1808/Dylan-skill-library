# KnowledgeBase — Config (single source of truth)

> Load this FIRST when the skill activates. Edit it once during setup (see `SETUP.md`).
> Every workflow resolves paths against `VAULT_PATH`. **If the vault moves, change ONLY this file.**
> No credentials belong in this file.

```
VAULT_PATH: ~/Obsidian/Memories
OWNER_NAME: (your name, used as the default decision owner)
SOURCES_INDEX: 2. Notes/Reference/sources-index.md
```

`VAULT_PATH` is your Obsidian vault root: `~` or an absolute path (`C:/Users/you/Documents/MyVault` on Windows).

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
| sources index | `SOURCES_INDEX` above | running index of saves |
| templates | `5. Resources/Templates/` | note templates (copied from this skill's `References/*.template.md`) |
| session queue | `1. Inbox/Session Queue.md` | auto-fed by the optional `Tools/KnowledgeQueue.hook.ts` (Stop hook); processed via `Workflows/ProcessQueue.md` |
| archive | `6. Archive/` | retired content |

## Project Map

Project notes ALWAYS live one level under `3. Projects/` in a project folder. Resolve the folder from the repo/context via this alias map; create a new folder only for a genuinely new ongoing project (else use `Side-Projects/`). Replace the example rows with your own projects.

| Aliases (repo names, spoken references) | Folder |
|-----------------------------------------|--------|
| {{project aliases, e.g. "brand videos, reels, the channel"}} | `3. Projects/{{Project-Name}}/` |
| one-off explorations, unclassified projects | `3. Projects/Side-Projects/` |

## Optional features

```
# Telos goal mapping: tag notes with your goal/project IDs. Off by default.
TELOS_ENABLED: false
# TELOS_PROBLEMS: /path/to/PROBLEMS.md
# TELOS_GOALS: /path/to/GOALS.md
# TELOS_PROJECTS: /path/to/PROJECTS.md

# Voice notification: POST a short message to a local voice server before each workflow. Leave unset to skip.
# VOICE_ENDPOINT: http://localhost:8888/notify
```
