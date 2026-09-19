# Daily Note Workflow

Create or update a daily note that aggregates everything saved/created on a given day.

## Configuration

```
VAULT_PATH: load from ../CONFIG.md (single source of truth)
DAILY_NOTES_DIR: 7. Daily Notes
TEMPLATE_PATH: 5. Resources/Templates/daily-note.md
```

## Daily Note File

- **Path:** `{VAULT_PATH}/{DAILY_NOTES_DIR}/{YYYY-MM-DD}.md`
- **One file per day** — all activity for that day is linked from this file

## New Day File Format

If today's daily note does not exist, create it:

```markdown
---
title: "{Month DD, YYYY}"
date: {YYYY-MM-DD}
type: daily-note
tags:
  - daily-note
---

# {Month DD, YYYY}

## Journal

*No journal entry yet.*

## Notes

*No notes saved today.*

## Resources

*No resources clipped today.*
```

## Updating the Daily Note

When a new note, journal entry, or resource is saved, update the corresponding section:

### Adding a Note Link

Replace `*No notes saved today.*` (if first note) or append after existing links in the `## Notes` section:

```markdown
- [[{YYYY-MM-DD-slug}]] — {title}
```

### Adding a Journal Link

Replace `*No journal entry yet.*` with:

```markdown
- [[{YYYY-MM-DD}]] — Journal entry
```

### Adding a Resource Link

Replace `*No resources clipped today.*` (if first resource) or append after existing links in the `## Resources` section:

```markdown
- [[{YYYY-MM-DD-slug}]] — {title}
```

## Section Routing

| Content Type | Daily Note Section |
|-------------|-------------------|
| `note`, `learning`, `idea`, `conversation` | `## Notes` |
| `journal` | `## Journal` |
| `resource` | `## Resources` |
| `inbox`, `project` | `## Notes` |

## Procedure (called by other workflows)

This workflow is called as a subroutine by Save.md and DailyJournal.md — not directly by the user.

1. **Get today's date** in `YYYY-MM-DD` format
2. **Check if daily note exists:** Glob for `{VAULT_PATH}/{DAILY_NOTES_DIR}/{YYYY-MM-DD}.md`
3. **If new:** Create the file using the template above
4. **Read the existing daily note**
5. **Determine the section** from the content type (see Section Routing table)
6. **Update the section:**
   - If the placeholder text (`*No ... yet.*` or `*No ... today.*`) is present, replace it with the link
   - If links already exist in that section, append the new link after the last one
7. **Write the updated file** using the Edit tool

## Browse by Day (user-facing)

**Trigger:** User says "what did I save today", "daily note", "show today", "browse by day"

1. **Get the date** — today if not specified, or parse the user's date reference
2. **Read the daily note** at `{VAULT_PATH}/{DAILY_NOTES_DIR}/{YYYY-MM-DD}.md`
3. **If exists:** Display the contents — all linked notes, journal entries, resources
4. **If not exists:** Tell user "No daily note for {date} — nothing was saved that day."

## Backfill (one-time setup)

**Trigger:** User says "backfill daily notes" or "create daily notes for existing content"

1. **Scan all vault directories** for files matching `YYYY-MM-DD-*.md` pattern
2. **Group files by date**
3. **For each date with files:** Create a daily note and populate links
4. **Report:** "Created {N} daily notes covering {date range}"
