# Setup Workflow

Verify the Obsidian vault and KnowledgeBase config before the first save. Read-only unless the principal explicitly asks you to create missing folders or templates.

## Voice Notification

```bash
curl -s -X POST http://localhost:31337/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running the Setup workflow in the KnowledgeBase skill to verify the vault"}' \
  > /dev/null 2>&1 &
```

Running the **Setup** workflow in the **KnowledgeBase** skill to verify the vault...

## Step 1: Load config

Read `CONFIG.md` in the skill root. Resolve `VAULT_PATH` (`~` → `$HOME`). If the file still contains a placeholder or a path that does not exist, stop and ask them to edit `CONFIG.md` (see `SETUP.md`). Do not invent a vault location.

## Step 2: Check the vault

Confirm all of:

- The vault directory exists
- `1. Inbox/`, `2. Notes/` (with Reference, Learning, Ideas, Conversations, People, Decisions), `3. Projects/`, `4. Journal/`, `5. Resources/Templates/`, `7. Daily Notes/` exist
- Templates `person.md`, `decision.md`, `daily-note.md` exist under `5. Resources/Templates/`
- The sources index path from `CONFIG.md` exists (or is missing — report it, do not create unless asked)
- Project Map folders exist for aliases they actually use

Report each as present or missing. Do not create files in this step.

## Step 3: Optional queue hook

If they asked to process the session queue, check that `~/.claude/hooks/KnowledgeQueue.hook.ts` exists and that `1. Inbox/Session Queue.md` is writable. Missing hook is not a setup failure — ProcessQueue can still run on a hand-built queue.

## Step 4: Report

Tell them:

- Resolved `VAULT_PATH`
- Missing folders / templates (if any), with the exact mkdir/cp from `SETUP.md`
- Whether a first save would have a home for each type in the Quick Reference table

If everything is present: setup is done. The first real write waits for an explicit save / journal / decision request.

## Errors

| Problem | Action |
|---------|--------|
| `CONFIG.md` path does not exist | Ask them to set `VAULT_PATH`; do not write notes into a guessed folder |
| Vault exists but folders missing | Show the mkdir block from `SETUP.md`; create only if they say to |
| Templates missing | Copy from `References/*.template.md` only if they say to |
| Project alias unknown | Use `3. Projects/Side-Projects/` or ask; never save flat under `3. Projects/` |
