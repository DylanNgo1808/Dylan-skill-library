# Synthesize Workflow

Generate concept pages that synthesize knowledge across multiple vault notes on the same topic. Inspired by Karpathy's LLM Wiki pattern where the LLM produces entity/concept pages with cross-references.

## Configuration

```
VAULT_PATH: load from ../CONFIG.md (single source of truth)
SYNTHESIS_DIR: 2. Notes/Synthesis
```

## Trigger Phrases

"synthesize notes on", "merge notes about", "concept page for", "synthesize", "what do I know about", "combine notes on", "synthesis page", "create concept page"

---

## Procedure

### 1. Receive Topic

The user provides a topic, tag, or question. Examples:
- "synthesize notes on agentic architecture"
- "concept page for typescript patterns"
- "what do I know about product-led growth"

If the topic is too vague (e.g., "everything"), ask user to narrow it.

### 2. Freshness Check (before searching)

Before doing any work, check if a synthesis page for this topic already exists:

1. Glob `{VAULT_PATH}/{SYNTHESIS_DIR}/*{topic-slug}*synthesis*.md`
2. If found:
   - Read its frontmatter `date:` and `sources:` count
   - Continue to step 3 to search — if search finds more source notes than the existing synthesis had, update it
   - If search finds the same count → tell user: "Existing synthesis from {date} with {N} sources is still current. Want me to regenerate anyway?" and stop unless they confirm

### 3. Search Vault for Source Notes

Run all three searches in parallel (max 5 Grep/Glob calls total):

1. **Tag search:** Grep `VAULT_PATH` for the topic terms in frontmatter tags
2. **Title search:** Glob `VAULT_PATH` for `**/*{topic-slug}*.md`
3. **Content search:** Grep `VAULT_PATH` for the topic terms in note body content

**Deduplicate:** Merge results from all three searches into a unique set by file path. Exclude any files in `{SYNTHESIS_DIR}` (don't synthesize syntheses).

**Minimum 3 source notes required** — if fewer than 3 found, tell the user: "Only found {N} notes on '{topic}'. Need at least 3 to synthesize. Try a broader topic or save more notes first."

**Cap: max 15 source notes.** If more found, take the 15 most recent by `date:` frontmatter field.

### 4. Read Source Notes

Read each source note to extract:
- Title and date
- Key content (main ideas, claims, patterns, examples)
- Tags and Telos connections
- Any existing wikilinks

**Do NOT summarize superficially.** Read the full content of each note. The synthesis should demonstrate understanding, not just aggregation.

### 5. Generate Concept Page

Create a synthesis page with this structure:

```markdown
---
title: "{Topic} — Synthesis"
date: {YYYY-MM-DD}
type: synthesis
tags:
  - synthesis
  - {topic-tag-1}
  - {topic-tag-2}
sources: {N}
telos:
  problems: [{inferred from source notes}]
  goals: [{inferred from source notes}]
  projects: [{inferred from source notes}]
connections:
  related: [{wikilinks to all source notes}]
  status: connected
---

# {Topic}

{2-3 sentence overview: what this topic is and why it matters in Dylan's context}

## Key Patterns

{Recurring themes, patterns, or principles across the source notes. Not a list of summaries — actual synthesis of what the notes collectively reveal.}

## Core Ideas

{The most important ideas extracted and organized logically. Group related ideas from different notes together. Cite source notes with wikilinks: "...as explored in [[2026-03-06-note-slug]]".}

## Contradictions & Tensions

{Any conflicting claims or unresolved tensions across notes. If none found: "No contradictions detected across source notes."}

## Open Questions

{Questions that the source notes raise but don't answer. Gaps in understanding. Areas where more research or notes would help.}

## Sources

{Bulleted list of all source notes with wikilinks and one-line descriptions:}
- [[2026-03-06-note-slug]] — {one-line summary of what this note contributed}
- [[2026-02-18-other-note]] — {one-line summary}
```

### 6. Write to Vault

1. **Generate filename:** `{YYYY-MM-DD}-{topic-slug}-synthesis.md`
2. **Write file** to `{VAULT_PATH}/{SYNTHESIS_DIR}/`
   - Create the `Synthesis` directory if it doesn't exist (first synthesis page)
3. **Update daily note:** Follow `Workflows/DailyNote.md` — add wikilink under `## Notes`
4. **Confirm** to user with: file path, source count, key patterns found, open questions

---

## Examples

**User says:** "synthesize notes on agentic architecture"

→ Search finds: 8 notes tagged `agents`, `agentic`, `architecture`
→ Reads all 8, identifies patterns: vertical agents > horizontal, tool-use patterns, browser automation approaches
→ Writes: `{VAULT_PATH}/2. Notes/Synthesis/2026-04-06-agentic-architecture-synthesis.md`
→ Reports: "Synthesized 8 notes into concept page. Key patterns: vertical agent design, 4-layer browser architecture, tool-calling conventions. Open questions: multi-agent coordination strategies, agent memory persistence."

**User says:** "what do I know about product strategy"

→ Search finds: 4 notes across product, strategy, growth tags
→ Writes synthesis page
→ Reports findings and gaps

---

## Edge Cases

- **Fewer than 3 source notes:** Don't synthesize — report count and suggest broader topic
- **Duplicate topic:** Freshness check in step 2 catches this — existing synthesis is updated, not duplicated
- **Cross-domain topic:** If sources span very different domains (e.g., "patterns" matches both coding and design), ask user to narrow scope
- **Very large source notes:** Read full content but cap synthesis page body at ~2000 words to keep it scannable
- **No Telos connection across sources:** Set `telos.relevance: none` — not every synthesis needs a life-purpose link
