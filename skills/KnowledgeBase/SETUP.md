# KnowledgeBase setup

Save, search, and tidy notes in a local Obsidian vault. The skill is markdown workflows — no API key. Edit `CONFIG.md` once; every workflow reads paths from there.

The agent-facing version of this guide is [Workflows/Setup.md](Workflows/Setup.md).

## Requirements

- An [Obsidian](https://obsidian.md) vault (or any markdown folder with the same layout)
- Claude Code (or another agent that can read this skill and write files)
- Optional: [Bun](https://bun.sh) — only if you install the session-queue Stop hook

## 1. Point the skill at your vault

Open [CONFIG.md](CONFIG.md) and set:

```
VAULT_PATH: ~/Obsidian/Memories
```

Use `~` or an absolute path. If the vault moves later, change **only** this file.

Then edit the **Project Map** in the same file so repo names and spoken aliases resolve to folders under `3. Projects/`. The shipped map is an example (Craftboard, Avada, PDF-Invoice, LifeOS, Side-Projects) — replace it with yours.

## 2. Create the folder layout

From the vault root:

```sh
VAULT="${HOME}/Obsidian/Memories"
mkdir -p \
  "$VAULT/1. Inbox" \
  "$VAULT/2. Notes/Reference" \
  "$VAULT/2. Notes/Learning" \
  "$VAULT/2. Notes/Ideas" \
  "$VAULT/2. Notes/Conversations" \
  "$VAULT/2. Notes/People" \
  "$VAULT/2. Notes/Decisions" \
  "$VAULT/2. Notes/Synthesis" \
  "$VAULT/3. Projects/Side-Projects" \
  "$VAULT/4. Journal" \
  "$VAULT/5. Resources/Clippings" \
  "$VAULT/5. Resources/Templates" \
  "$VAULT/6. Archive" \
  "$VAULT/7. Daily Notes"
```

Create extra project folders to match the Project Map (`3. Projects/Craftboard/`, etc.).

## 3. Install note templates

Copy the shipped templates into the vault:

```sh
SKILL="$HOME/.claude/skills/KnowledgeBase"
VAULT="${HOME}/Obsidian/Memories"
cp "$SKILL/References/person.template.md"      "$VAULT/5. Resources/Templates/person.md"
cp "$SKILL/References/decision.template.md"    "$VAULT/5. Resources/Templates/decision.md"
cp "$SKILL/References/daily-note.template.md"  "$VAULT/5. Resources/Templates/daily-note.md"
cp "$SKILL/References/weekly-review.template.md" "$VAULT/5. Resources/Templates/weekly-review.md"
```

Create an empty sources index if you do not have one yet:

```sh
cat > "$VAULT/2. Notes/Reference/2026-02-28-sources-index.md" <<'EOF'
# Sources index

Chronological log of notes saved by KnowledgeBase.

EOF
```

If you already have an index, set its path in `CONFIG.md` (`sources index` row) instead of overwriting it.

## 4. Verify

Ask the agent:

> set up KnowledgeBase

or:

> lint vault

Setup should report: vault exists, `CONFIG.md` path resolves, folders and templates are present. Lint on an empty vault should say it is too small to be useful — that is success, not a failure.

Then save a test note ("save this as a learning: KnowledgeBase is wired") and confirm a file appeared under `2. Notes/Learning/` plus a link on `7. Daily Notes/YYYY-MM-DD.md`.

## 5. Optional — session queue hook

ProcessQueue turns Claude Code sessions into project notes. The Stop hook only **queues** metadata; it never writes notes and never calls a model.

```sh
cp "$HOME/.claude/skills/KnowledgeBase/Tools/KnowledgeQueue.hook.ts" "$HOME/.claude/hooks/KnowledgeQueue.hook.ts"
chmod +x "$HOME/.claude/hooks/KnowledgeQueue.hook.ts"
```

Register it as a Stop hook in `~/.claude/settings.json` (merge into the existing `hooks.Stop` array):

```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "$HOME/.claude/hooks/KnowledgeQueue.hook.ts"
          }
        ]
      }
    ]
  }
}
```

Override the vault path with `KNOWLEDGEBASE_VAULT` if it is not `~/Obsidian/Memories`. A session is queued only after 2+ real user prompts and ~20 KB of transcript. Process later with: **process the knowledge base queue**.

## What not to commit

- The vault itself (notes, people files, decisions, journal)
- `1. Inbox/Session Queue.md` (session ids and local transcript paths)
- Any Telos / identity files the lint workflow reads from `~/.claude`

This skill folder is the instructions. The vault is the data.

## Quick map

| You say | Workflow | Writes |
|---------|----------|--------|
| save this / clip this | [Workflows/Save.md](Workflows/Save.md) | typed note + daily note + sources index |
| search vault | [Workflows/Search.md](Workflows/Search.md) | nothing |
| journal | [Workflows/DailyJournal.md](Workflows/DailyJournal.md) | `4. Journal/YYYY-MM-DD.md` |
| log a decision | [Workflows/Decision.md](Workflows/Decision.md) | refuses without a real why and tradeoff |
| what do I know about X | [Workflows/Synthesize.md](Workflows/Synthesize.md) | concept page (needs 3+ source notes) |
| process the queue | [Workflows/ProcessQueue.md](Workflows/ProcessQueue.md) | project notes after you OK the draft |
| lint vault | [Workflows/Lint.md](Workflows/Lint.md) | may rebuild the topical index |
