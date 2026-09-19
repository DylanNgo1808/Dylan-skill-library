# Save Workflow

Save content to Dylan's Obsidian vault with proper formatting and location routing.

## Configuration

```
VAULT_PATH: load from ../CONFIG.md (single source of truth)
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
| `project` | `3. Projects/{Project}/` | Project-specific note, task context — resolve `{Project}` via the CONFIG.md Project Map (Craftboard, Avada, PDF-Invoice, LifeOS, Side-Projects). NEVER save flat into `3. Projects/` |
| `resource` | `5. Resources/Clippings/` | Web clipping, article save, external content |
| `inbox` | `1. Inbox/` | Default fallback, unsorted, quick capture |

**Default:** If type cannot be determined, use `inbox`.

## Filename Format

```
YYYY-MM-DD-{slug}.md
```

- `slug`: Lowercase, hyphens for spaces, strip special characters, max 60 characters
- Example: `2026-02-18-typescript-generics-cheatsheet.md`

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
telos:
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

- **Read Telos:** `~/.claude/PAI/USER/TELOS/PROBLEMS.md`, `GOALS.md`, `PROJECTS.md` (one Bash cat concat)
- **Grep vault for connections:** 1-2 rg calls on `VAULT_PATH` for the note's top 2-3 tags/keywords
- **Read daily note:** `{VAULT_PATH}/7. Daily Notes/{YYYY-MM-DD}.md` (to know current state before writing)
- **Read sources index:** `{VAULT_PATH}/2. Notes/Reference/2026-02-28-sources-index.md`

> All 4 reads happen concurrently. Process results together once all return.

### Phase 3 — Synthesize (no tool calls)

From Phase 2 results, determine:
- **Telos connections:** map to Problems/Goals/Projects IDs. If none clear → `relevance: none`
  - IDs in `telos:` frontmatter only. No wikilinks to hub files (`[[Goals]]` etc.)
- **Vault connections (Tier 2):** extract matching filenames as `[[wikilinks]]`, cap at 5
  - If no matches → orphan (`connections.status: orphan`, `*No connections found yet.*`)
- **Daily note update:** compose the wikilink line to append
- **Sources index update:** compose the new entry line

### Phase 4 — Parallel writes (single tool call batch)

Fire ALL writes in one parallel batch:

- **Write main note file** → `{VAULT_PATH}/{vault_location}/{filename}.md`
- **Write/update daily note** → `{VAULT_PATH}/7. Daily Notes/{YYYY-MM-DD}.md`
- **Update sources index** → append entry to sources-index file

> Telos activity tracking (explicit opt-in only): if user said "track this" / "log this to G7", run after Phase 4:
> `bun ~/.claude/skills/Telos/Tools/TelosLog.ts --text "{title}" --goalId {G} --metricIndex {N} --delta 1`

### Phase 5 — Confirm

Reply to user: file path, title, type, tags, telos IDs, connections (related notes or "orphan").

**References in frontmatter/body:** include `references:` YAML field + `## References` section only if URLs were found in the conversation.

## Examples

**User says:** "Save this — TypeScript generics are covariant by default for arrays"

→ Type: `learning`
→ Path: `{VAULT_PATH}/2. Notes/Learning/2026-02-18-typescript-generics-covariance.md`
→ Tags: typescript, generics, type-system
→ Telos: G7, PR2
→ Connections: Related: [[2026-02-10-typescript-utility-types]]

**User says:** "Clip this article about quantum computing breakthroughs"

→ Type: `resource`
→ Path: `{VAULT_PATH}/5. Resources/Clippings/2026-02-18-quantum-computing-breakthroughs.md`
→ Tags: quantum-computing, science, technology
→ Connections: Orphan (no Telos match, no related notes found)

**User says:** "Save my thoughts on why education needs to be personalized"

→ Type: `idea`
→ Path: `{VAULT_PATH}/2. Notes/Ideas/2026-02-18-personalized-education.md`
→ Tags: education, personalization, learning
→ Telos: P0, G1
→ Connections: Related: [[2026-02-05-self-directed-learning]]

## Edge Cases

- **Duplicate filename:** Append `-2`, `-3`, etc. if file already exists
- **Project notes:** ALWAYS saved inside a project subfolder of `3. Projects/` — use the CONFIG.md Project Map to pick it; create a new folder only for a genuinely new ongoing project, else `Side-Projects/`
- **Long content:** No truncation. Save full content.
- **URLs:** If user provides a URL, use WebFetch to extract content first, then save the extracted content
