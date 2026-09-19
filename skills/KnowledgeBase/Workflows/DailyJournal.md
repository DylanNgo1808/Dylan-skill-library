# Daily Journal Workflow

Quick journal entry creation — creates or appends to today's journal file.

## Configuration

```
VAULT_PATH: load from ../CONFIG.md (single source of truth)
JOURNAL_DIR: 4. Journal
```

## Journal File

- **Path:** `{VAULT_PATH}/{JOURNAL_DIR}/{YYYY-MM-DD}.md`
- **One file per day** — multiple entries append to the same file

## New Day File Format

If today's journal file does not exist, create it:

```markdown
---
title: "Journal — {Month DD, YYYY}"
date: {YYYY-MM-DD}
type: journal
tags:
  - journal
  - daily
---

# Journal — {Month DD, YYYY}

## {HH:MM}

{entry_content}
```

## Appending to Existing File

If today's journal file already exists, append a new timestamped section:

```markdown

## {HH:MM}

{entry_content}
```

Use the Edit tool to append after the last line of the existing file.

## Procedure

1. **Get today's date** and format the filename: `YYYY-MM-DD.md`
2. **Check if file exists** — use Glob to look for `{VAULT_PATH}/{JOURNAL_DIR}/{YYYY-MM-DD}.md`
3. **If new:** Create file with full frontmatter and first entry
4. **If exists:** Read existing file, then append new timestamped entry
5. **Update daily note:** Follow `Workflows/DailyNote.md` procedure — create or update today's daily note at `{VAULT_PATH}/7. Daily Notes/{YYYY-MM-DD}.md` with a link to the journal entry in the `## Journal` section
6. **Confirm** to user: "Journal entry added for {date} at {time}"

## Entry Formatting

- Keep the user's voice and tone — minimal editing
- Add timestamp header for each entry
- If user provides bullet points, preserve them
- If user provides prose, preserve it
- Do not add AI commentary or suggestions unless asked

## Edge Cases

- **Multiple entries same minute:** Append to the same time section
- **User says "journal" with no content:** Ask what they want to journal about
- **Long entries:** No truncation, save everything

## Weekly Review

**Trigger:** User says "weekly review" or "week review"

### Procedure

1. **Read the template** from `{VAULT_PATH}/5. Resources/Templates/weekly-review.md`
2. **Replace `{{date}}`** with today's date in `YYYY-MM-DD` format
3. **Generate filename:** `{YYYY-MM-DD}-weekly-review.md`
4. **Write the file** to `{VAULT_PATH}/{JOURNAL_DIR}/{filename}`
5. **Confirm** to user: "Weekly review created for {date}"

### Notes

- One weekly review per week — if the file already exists for this date, warn before overwriting
- The template includes the current Telos goals (G1-G9), projects (PR0-PR3), and strategies (S0-S4)
- User fills in the template after creation — do not auto-fill sections
