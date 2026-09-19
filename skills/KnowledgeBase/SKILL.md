---
name: KnowledgeBase
description: Save, search, and synthesize content in Dylan's local Obsidian vault (~/Obsidian/Memories). USE WHEN user says 'save to vault', 'knowledge base', 'save note', 'obsidian', 'remember this', 'save this', 'clip this', 'save conversation', 'meeting notes', 'journal entry', 'daily journal', 'search vault', 'search notes', 'find in vault', 'save to obsidian', 'vault search', 'log this', 'note this down', 'add to knowledge base', 'lint vault', 'audit vault', 'vault health', 'synthesize notes', 'concept page', 'merge notes', 'what do I know about', 'process the queue', 'knowledge base queue', 'session queue', 'process queued sessions', 'log a decision', 'decision log', 'we decided', 'record this decision', 'log this choice'.
---

## Configuration (load first)

All paths come from `CONFIG.md` (single source of truth). Read it once when the skill activates — it holds `VAULT_PATH`, the folder map, and the voice endpoint. **If the vault ever moves, edit only `CONFIG.md`.**

## Customization

**Before executing, check for user customizations at:**
`~/.claude/skills/PAI/USER/SKILLCUSTOMIZATIONS/KnowledgeBase/`

If this directory exists, load and apply any PREFERENCES.md, configurations, or resources found there. These override default behavior. If the directory does not exist, proceed with skill defaults.

## MANDATORY: Voice Notification (REQUIRED BEFORE ANY ACTION)

```bash
curl -s -X POST http://localhost:31337/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running the WORKFLOWNAME workflow in the KnowledgeBase skill to ACTION", "voice_id": "21m00Tcm4TlvDq8ikWAM", "voice_enabled": true}' \
  > /dev/null 2>&1 &
```

# KnowledgeBase Skill

Save, search, and manage content in the Obsidian vault.

## Workflow Routing

| Trigger | Workflow |
|---------|----------|
| Set up KnowledgeBase, vault path, first-time install | `Workflows/Setup.md` |
| Save content, note, idea, learning, conversation, reference, clip, resource | `Workflows/Save.md` |
| Search vault, find notes, search by tag/keyword | `Workflows/Search.md` |
| Journal entry, daily journal, log today | `Workflows/DailyJournal.md` |
| Daily note, what did I save today, browse by day, backfill daily notes | `Workflows/DailyNote.md` |
| Lint vault, audit vault, vault health check, KB health | `Workflows/Lint.md` |
| Synthesize notes, concept page, merge notes, what do I know about | `Workflows/Synthesize.md` |
| Process the queue, knowledge base queue, session queue, review queued sessions | `Workflows/ProcessQueue.md` |
| Log a decision, decision log, we decided, record this choice | `Workflows/Decision.md` |

## Quick Reference

| Action | Default Location | Filename |
|--------|-----------------|----------|
| Save note | `2. Notes/Reference/` | `YYYY-MM-DD-slug.md` |
| Save learning | `2. Notes/Learning/` | `YYYY-MM-DD-slug.md` |
| Save idea | `2. Notes/Ideas/` | `YYYY-MM-DD-slug.md` |
| Save conversation | `2. Notes/Conversations/` | `YYYY-MM-DD-slug.md` |
| Save person note | `2. Notes/People/` | `{Natural Name}.md` (living doc, no date) |
| Log decision (WHY + tradeoff enforced) | `2. Notes/Decisions/` | `YYYY-MM-DD-slug.md` |
| Save project note | `3. Projects/{Project}/` (alias map in CONFIG.md — never flat) | `YYYY-MM-DD-slug.md` |
| Process session queue | `1. Inbox/Session Queue.md` → `3. Projects/{Project}/` | `YYYY-MM-DD-slug.md` |
| Journal entry | `4. Journal/` | `YYYY-MM-DD.md` |
| Clip resource | `5. Resources/Clippings/` | `YYYY-MM-DD-slug.md` |
| Quick capture (fallback) | `1. Inbox/` | `YYYY-MM-DD-slug.md` |
| Daily note | `7. Daily Notes/` | `YYYY-MM-DD.md` |
| Synthesis page (created on first use) | `2. Notes/Synthesis/` | `YYYY-MM-DD-{topic}-synthesis.md` |
| Lint report | Console output | — |
