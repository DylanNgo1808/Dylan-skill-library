# ProcessQueue Workflow

Turn queued Claude Code sessions into project notes in the vault. The queue is fed automatically by `~/.claude/hooks/KnowledgeQueue.hook.ts` (Stop hook) — every substantive session gets one entry. This workflow is the human-in-the-loop half: review, draft, approve, file.

## Configuration

```
VAULT_PATH: load from ../CONFIG.md (single source of truth)
QUEUE: {VAULT_PATH}/1. Inbox/Session Queue.md
```

## Entry format (written by the hook)

```
- [ ] YYYY-MM-DD HH:MM · **project** (branch) — "first prompt hint…" · sid:<session_id> · `<transcript_path>`
```

## Procedure

### Phase 1 — Collect

1. Read the queue file. Collect unchecked entries (`- [ ]`). If none: report "queue is empty" and stop.
2. List entries to the user (date, project, hint). Default scope is **all unchecked**; the user may narrow to specific entries.

### Phase 2 — Extract (delegate, keep main context clean)

For each selected entry, spawn a general-purpose agent (parallel batch, one per session) with:

> Read the JSONL transcript at `<transcript_path>`. Return raw data, no prose: (1) topics discussed, (2) decisions made and why, (3) research findings and conclusions, (4) URLs/links mentioned, (5) files/systems touched, (6) one-line session summary. If the session was routine mechanics with no research or decisions worth keeping, return exactly `NO_SUBSTANCE`.

- `NO_SUBSTANCE` result → mark entry `- [x] … · skipped (no substance)` and continue.
- Transcript missing (cleaned up by retention) → mark `- [x] … · skipped (transcript gone)` and continue.

### Phase 3 — Draft

For each substantive session, draft a note using the **Save.md file format** (frontmatter: title, date, type: project, tags, telos, connections):

- **Path:** `{VAULT_PATH}/3. Projects/{Project}/YYYY-MM-DD-{slug}.md` — resolve `{Project}` via the alias map in CONFIG.md; date = session date from the queue entry.
- **Body sections:** Context (what the session was), Decisions, Findings, Links, Next steps (if any).
- **Connections:** grep the vault for the note's top tags/keywords; wikilink up to 5 related notes.
- Multiple queued sessions, same project, same day → one combined note is fine.

### Phase 4 — Approve & write (single confirmation for the batch)

1. Show the user one table: proposed title → target path → one-line summary. Wait for OK; apply any edits they ask for.
2. On OK, write all notes, then per Save.md Phase 4: update the daily note(s) for the session date(s) and append to the sources index.
3. Check off each processed queue entry: `- [x] … → [[note-filename]]`.

## Rules

- Never delete queue entries — check them off with an outcome (`→ [[note]]`, `skipped (…)`). The queue doubles as a capture log.
- Never process an entry twice: checked = done.
- The hook dedupes by session id, but a session may be queued while still ongoing — if a transcript's session appears to still be running (entry from today, this session), leave it unchecked for next time.
