# Dylan Skill Library

Six [Claude Code skills](https://docs.claude.com/en/docs/claude-code/skills) for the shape of work that happens before and around writing code: aligning on what to build, writing it down, generating a build loop to execute it, and reasoning/deliberation tools you can reach for at any point.

They're plain markdown — no framework, no server, no extra CLI tools required beyond Claude Code itself. Drop a folder in, and Claude picks it up automatically when the conversation matches its description.

## The skills

| Skill | What it does |
|-------|---------------|
| **GrillMe** | Relentless one-question-at-a-time interview to reach shared understanding before any planning starts. Based on [Matt Pocock](https://github.com/mattpocock/skills)'s "grill me" workflow. |
| **WritePRD** | Summarizes a completed GrillMe alignment into a PRD — problem, solution, user stories, implementation decisions, testing decisions, proposed modules, out of scope. Based on Matt Pocock's "write a PRD" workflow. |
| **loopgen** | Generates a project-agnostic build-loop prompt: reads your `CLAUDE.md` + stack + progress doc, drafts numbered increments, and outputs a paste-ready prompt that implements one increment per run — read, plan, implement, verify, commit, repeat. |
| **FirstPrinciples** | Elon Musk-style physics-first reasoning: deconstruct a problem to its actual constituent parts, challenge every constraint as hard/soft/assumption, then reconstruct a solution from only what's truly immutable. Three workflows (Deconstruct, Challenge, Reconstruct). |
| **Council** | Multi-agent debate — compose 4-6 topic-specific personas, run them through 3 rounds (positions → challenges → synthesis) in parallel, get a visible transcript with genuine disagreement instead of a single averaged opinion. Includes a fast 1-round "Quick" mode. |
| **ExtractWisdom** | Content-adaptive extraction from videos, podcasts, articles, and interviews. Instead of fixed sections (IDEAS/QUOTES/HABITS every time), it reads the content first and builds custom section headers around whatever's actually there — five depth levels from a 30-second skim to a comprehensive pass. |

**Suggested pipeline:** `GrillMe` → `WritePRD` → `loopgen` → run the generated prompt. `FirstPrinciples` and `Council` are reasoning tools you can reach for at any point in that pipeline (or standalone); `ExtractWisdom` is unrelated — a content-processing utility.

## Install

Skills live at `~/.claude/skills/<SkillName>/SKILL.md` (available in every project) or `<project>/.claude/skills/<SkillName>/SKILL.md` (scoped to one project).

**All six, for every project:**
```bash
git clone https://github.com/DylanNgo1808/Dylan-skill-library.git
cp -r Dylan-skill-library/skills/* ~/.claude/skills/
```

**Pick specific ones:**
```bash
cp -r Dylan-skill-library/skills/GrillMe ~/.claude/skills/
cp -r Dylan-skill-library/skills/WritePRD ~/.claude/skills/
```

**Scoped to one project only** — same thing, into `<project>/.claude/skills/` instead of `~/.claude/skills/`.

Claude Code discovers skills automatically and invokes them when a request matches the skill's `description` (the "USE WHEN" triggers listed in each `SKILL.md`), or when you name the skill directly — e.g. "grill me on this feature" or "run loopgen for the export flow."

## Notes

- These are plain-markdown Claude Code skills — no external services, no API keys, no custom CLI tools. `loopgen`'s generated prompts assume a fairly standard project (a lockfile, a `package.json` or equivalent, optionally a `CLAUDE.md`); it degrades gracefully with generic defaults if any of that is missing.
- `GrillMe` and `WritePRD` are adapted from [mattpocock/skills](https://github.com/mattpocock/skills) (`grill-me` / `to-spec`) — credit to Matt Pocock for the original workflow design. This version keeps a mandatory "Proposed Modules to Modify" section in the PRD that the upstream version deliberately omits, and writes to a local file by default instead of an issue tracker.
- `Council` composes personas by writing them directly into subagent prompts — no separate agent-authoring tool required, just Claude Code's built-in Task/subagent capability.

## License

MIT — see [LICENSE](LICENSE).
