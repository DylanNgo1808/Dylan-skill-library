# Search Workflow

Search Dylan's Obsidian vault for existing notes by keyword, tag, or date.

## Configuration

```
VAULT_PATH: load from ../CONFIG.md (single source of truth)
```

## Search Modes

### 1. Keyword Search (Default)

Search file contents for matching terms.

```
Tool: Grep
Path: VAULT_PATH
Pattern: {user_query}
Output: content (with context lines)
```

### 2. Tag Search

Search YAML frontmatter for specific tags.

```
Tool: Grep
Path: VAULT_PATH
Pattern: "^  - {tag_name}$"
Glob: "**/*.md"
Output: files_with_matches
```

Then read matched files to present summaries.

### 3. Title/Filename Search

Search for files by name pattern.

```
Tool: Glob
Path: VAULT_PATH
Pattern: "**/*{query}*.md"
```

### 4. Date Range Search

Find notes from a specific date or range.

```
Tool: Glob
Path: VAULT_PATH
Pattern: "**/{YYYY-MM-DD}*.md"
```

For ranges, use Grep on the `date:` frontmatter field.

### 5. Type Search

Find all notes of a specific type.

```
Tool: Grep
Path: VAULT_PATH
Pattern: "^type: {type_name}"
Glob: "**/*.md"
Output: files_with_matches
```

## Procedure

1. **Parse user query** — determine search mode (keyword, tag, title, date, type)
2. **Execute search** using appropriate tool(s)
3. **Collect results** — gather file paths and relevant snippets
4. **Present results** in a clean format:
   - File title (from frontmatter or filename)
   - Date
   - Type and tags
   - Brief content preview (first 2-3 lines of body)
   - Full vault path
5. **Offer actions** — "Want me to read the full note?" or "Want me to open it?"

## Result Format

```
### Search Results for "{query}"

**{N} notes found:**

1. **{Title}** ({date})
   Type: {type} | Tags: {tags}
   > {first 2 lines of content...}
   Path: `{full_path}`

2. ...
```

## Edge Cases

- **No results:** Suggest alternative search terms or broader search
- **Too many results (>20):** Show top 10 by date (most recent first), note total count
- **Ambiguous query:** Search across all modes and merge results
