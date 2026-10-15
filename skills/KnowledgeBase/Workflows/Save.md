# Save Workflow

Save content to your Obsidian vault with proper formatting and location routing.

## Configuration

```
VAULT_PATH: load from ../CONFIG.md (single source of truth)
SOURCES_INDEX: load from ../CONFIG.md
TELOS_ENABLED: load from ../CONFIG.md (default false)
```

All paths below are relative to `VAULT_PATH`.

## Content Type Detection

Determine the content type from user intent or explicit instruction:

| Type | Vault Location | Signals |
|------|---------------|---------|
| `note` | `2. Notes/Reference/` | General note, reference, factual content |
| `learning` | `2. Notes/Learning/` | Lesson learned, tutorial, how-to, TIL |
| `idea` | `2. Notes/Ideas/` | Brainstorm, concept, hypothesis, "what if" |
| `conversation` | `2. Notes/Conversations/` | Chat summary, meeting notes, discussion recap — when a person is discussed substantively, also update (or create) their file in `2. Notes/People/` and wikilink it |
| `person` | `2. Notes/People/` | Person profile: colleague, customer, partner. Living doc — filename is the natural name (`Sam Nguyen.md`, no date prefix), use template `5. Resources/Templates/person.md`, append to Interaction log instead of creating new files |
| `decision` | `2. Notes/Decisions/` | Decision-like content ("we decided", "going with X over Y") — do NOT plain-save; route to `Workflows/Decision.md` so WHY + tradeoff get enforced |
| `journal` | `4. Journal/` | Personal reflection, daily log (prefer DailyJournal workflow) |
| `project` | `3. Projects/{Project}/` | Project-specific note, task context — resolve `{Project}` via the CONFIG.md Project Map. NEVER save flat into `3. Projects/` |
| `resource` | `5. Resources/Clippings/` | Web clipping, article save, external content |
| `inbox` | `1. Inbox/` | Default fallback, unsorted, quick capture |

**Default:** If type cannot be determined, use `inbox`.

## Filename Format

```
YYYY-MM-DD-{slug}.md
```

- `slug`: Lowercase, hyphens for spaces, strip special characters, max 60 characters
- Example: `2026-02-18-typescript-generics-cheatsheet.md`
- Exception: `person` notes use the natural name (`Sam Nguyen.md`) so `[[Sam Nguyen]]` wikilinks resolve

## File Format

Every saved file uses this Obsidian-compatible markdown format:

```markdown
---
title: "{Title}"
date: {YYYY-MM-DD}
type: {content_type}
tags:
  - {tag1}
  - {tag2}
source: "{source_url_or_context}"
telos:            # only when TELOS_ENABLED is true
  problems: [P1]
  goals: [G1]
  projects: [PR0]
connections:
  related: ["[[2026-02-18-some-related-note]]"]
  status: connected | orphan
---

# {Title}

{Content body in clean markdown}

## Connections

**Related:** [[2026-02-18-some-related-note]] · [[2026-01-15-another-note]]

{Or if no connections found:}
*No connections found yet.*
```

## Procedure

### Phase 1 — Classify (no tool calls)

1. **Receive content** from user (text, URL summary, conversation excerpt, etc.)
2. **Determine content type** using the detection table above. Ask user if ambiguous.
3. **Decide metadata** in your head (title, date, tags, source, slug, vault path, filename). Extract any URLs from conversation context for `references:`.

### Phase 2 — Parallel reads (single tool call batch)

Fire ALL of these in one parallel batch — do not wait for one before starting the next:

- **Read Telos (only when TELOS_ENABLED):** the Problems, Goals and Projects files named in CONFIG.md (one Bash cat concat)
- **Grep vault for connections:** 1-2 rg calls on `VAULT_PATH` for the note's top 2-3 tags/keywords
- **Read daily note:** `{VAULT_PATH}/7. Daily Notes/{YYYY-MM-DD}.md` (to know current state before writing)
- **Read sources index:** `{VAULT_PATH}/{SOURCES_INDEX}` (create it with a `# Sources Index` header and `**Total entries:** 0` line if missing)

> All reads happen concurrently. Process results together once all return.

### Phase 3 — Synthesize (no tool calls)

From Phase 2 results, determine:
- **Telos connections (only when TELOS_ENABLED):** map to Problems/Goals/Projects IDs. If none clear → `relevance: none`
  - IDs in `telos:` frontmatter only. No wikilinks to hub files (`[[Goals]]` etc.)
  - When TELOS_ENABLED is false, omit the `telos:` block entirely
- **Vault connections (Tier 2):** extract matching filenames as `[[wikilinks]]`, cap at 5
  - One-directional: link FROM the new note TO existing notes; never edit existing notes to add backlinks
  - If no matches → orphan (`connections.status: orphan`, `*No connections found yet.*`)
- **Daily note update:** compose the wikilink line to append
- **Sources index update:** compose the new entry line under today's `## YYYY-MM-DD` heading, and bump `**Total entries:**`
  - URL source: `- [Title](URL) — \`type\` \`tag1, tag2\``
  - Conversation: `- **Title** — \`type\` _conversation_ \`tag1, tag2\``

### Phase 4 — Parallel writes (single tool call batch)

Fire ALL writes in one parallel batch:

- **Write main note file** → `{VAULT_PATH}/{vault_location}/{filename}.md`
- **Write/update daily note** → `{VAULT_PATH}/7. Daily Notes/{YYYY-MM-DD}.md` (see `Workflows/DailyNote.md`)
- **Update sources index** → append entry to the sources index file

### Phase 5 — Confirm

Reply to user: file path, title, type, tags, telos IDs (if enabled), connections (related notes or "orphan").

**References in frontmatter/body:** include `references:` YAML field + `## References` section only if URLs were found in the conversation.

## Examples

**User says:** "Save this — TypeScript generics are covariant by default for arrays"

→ Type: `learning`
→ Path: `{VAULT_PATH}/2. Notes/Learning/2026-02-18-typescript-generics-covariance.md`
→ Tags: typescript, generics, type-system
→ Connections: Related: [[2026-02-10-typescript-utility-types]]

**User says:** "Clip this article about quantum computing breakthroughs"

→ Type: `resource`
→ Path: `{VAULT_PATH}/5. Resources/Clippings/2026-02-18-quantum-computing-breakthroughs.md`
→ Tags: quantum-computing, science, technology
→ Connections: Orphan (no related notes found)

**User says:** "Save my thoughts on why short hooks work better on Reels"

→ Type: `idea`
→ Path: `{VAULT_PATH}/2. Notes/Ideas/2026-02-18-short-hooks-on-reels.md`
→ Tags: hooks, reels, short-video
→ Connections: Related: [[2026-02-05-reel-breakdown-notes]]

## Edge Cases

- **Duplicate filename:** Append `-2`, `-3`, etc. if file already exists
- **Project notes:** ALWAYS saved inside a project subfolder of `3. Projects/` — use the CONFIG.md Project Map to pick it; create a new folder only for a genuinely new ongoing project, else `Side-Projects/`
- **Long content:** No truncation. Save full content.
- **URLs:** If user provides a URL, use WebFetch to extract content first, then save the extracted content
