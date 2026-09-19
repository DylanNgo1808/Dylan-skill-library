# Dylan Skill Library

Nine [Claude Code skills](https://docs.claude.com/en/docs/claude-code/skills) for the shape of work that happens before and around writing code: aligning on what to build, writing it down, generating a build loop to execute it, reasoning/deliberation tools, local video analysis, personal Slack access, and an Obsidian knowledge base.

They're plain markdown skill definitions. Drop a folder in, and Claude picks it up automatically when the conversation matches its description. Most require no external service; `video-analysis` uses the Gemini API plus local video tools, `SlackUser` uses a personal Slack user token, and `KnowledgeBase` writes to a local Obsidian vault.

## The skills

| Skill | What it does |
|-------|---------------|
| **GrillMe** | Relentless one-question-at-a-time interview to reach shared understanding before any planning starts. Based on [Matt Pocock](https://github.com/mattpocock/skills)'s "grill me" workflow. |
| **WritePRD** | Summarizes a completed GrillMe alignment into a PRD — problem, solution, user stories, implementation decisions, testing decisions, proposed modules, out of scope. Based on Matt Pocock's "write a PRD" workflow. |
| **loopgen** | Generates a project-agnostic build-loop prompt: reads your `CLAUDE.md` + stack + progress doc, drafts numbered increments, and outputs a paste-ready prompt that implements one increment per run — read, plan, implement, verify, commit, repeat. |
| **FirstPrinciples** | Elon Musk-style physics-first reasoning: deconstruct a problem to its actual constituent parts, challenge every constraint as hard/soft/assumption, then reconstruct a solution from only what's truly immutable. Three workflows (Deconstruct, Challenge, Reconstruct). |
| **Council** | Multi-agent debate — compose 4-6 topic-specific personas, run them through 3 rounds (positions → challenges → synthesis) in parallel, get a visible transcript with genuine disagreement instead of a single averaged opinion. Includes a fast 1-round "Quick" mode. |
| **ExtractWisdom** | Content-adaptive extraction from videos, podcasts, articles, and interviews. Instead of fixed sections (IDEAS/QUOTES/HABITS every time), it reads the content first and builds custom section headers around whatever's actually there — five depth levels from a 30-second skim to a comprehensive pass. |
| **video-analysis** | Analyzes local video and audio with Gemini for timestamped summaries, visual explanations, critique, transcripts, and specific-moment search. |
| **SlackUser** | Read Slack as you with a personal user token (`xoxp-`): pull channels/DMs/threads, remember names, and send only behind an explicit on-disk sending switch. Setup: [skills/SlackUser/SETUP.md](skills/SlackUser/SETUP.md). |
| **KnowledgeBase** | Save, search, journal, log decisions, synthesize, and lint notes in a local Obsidian vault. Setup: [skills/KnowledgeBase/SETUP.md](skills/KnowledgeBase/SETUP.md). |

**Suggested pipeline:** `GrillMe` → `WritePRD` → `loopgen` → run the generated prompt. `FirstPrinciples` and `Council` are reasoning tools you can reach for at any point in that pipeline (or standalone); `ExtractWisdom`, `SlackUser`, and `KnowledgeBase` are unrelated utilities.

## Install

Skills live at `~/.claude/skills/<SkillName>/SKILL.md` (available in every project) or `<project>/.claude/skills/<SkillName>/SKILL.md` (scoped to one project).

**All of them, for every project:**
```bash
git clone https://github.com/DylanNgo1808/Dylan-skill-library.git
cp -r Dylan-skill-library/skills/* ~/.claude/skills/
```

**Pick specific ones:**
```bash
cp -r Dylan-skill-library/skills/GrillMe ~/.claude/skills/
cp -r Dylan-skill-library/skills/WritePRD ~/.claude/skills/
cp -r Dylan-skill-library/skills/video-analysis ~/.claude/skills/
cp -r Dylan-skill-library/skills/SlackUser ~/.claude/skills/
cp -r Dylan-skill-library/skills/KnowledgeBase ~/.claude/skills/
```

**Scoped to one project only** — same thing, into `<project>/.claude/skills/` instead of `~/.claude/skills/`.

Claude Code discovers skills automatically and invokes them when a request matches the skill's `description` (the "USE WHEN" triggers listed in each `SKILL.md`), or when you name the skill directly — e.g. "grill me on this feature" or "run loopgen for the export flow."

## Notes

- These are plain-markdown Claude Code skills. `video-analysis` additionally requires a private `GEMINI_API_KEY` or `GOOGLE_API_KEY`, Google's `google-genai` SDK, and `ffprobe`; `ffmpeg` is used when conversion or segmentation is needed. Never commit the API key. `SlackUser` requires Bun and a Slack **user** token (`xoxp-`) stored locally with mode `600`; sending stays off until you turn it on. Full setup: [skills/SlackUser/SETUP.md](skills/SlackUser/SETUP.md). Never commit the token or `data/directory.json`. `KnowledgeBase` requires a local Obsidian vault path in [skills/KnowledgeBase/CONFIG.md](skills/KnowledgeBase/CONFIG.md); full setup: [skills/KnowledgeBase/SETUP.md](skills/KnowledgeBase/SETUP.md). Never commit the vault (notes, people files, session queue). `loopgen`'s generated prompts assume a fairly standard project (a lockfile, a `package.json` or equivalent, optionally a `CLAUDE.md`); it degrades gracefully with generic defaults if any of that is missing.
- `GrillMe` and `WritePRD` are adapted from [mattpocock/skills](https://github.com/mattpocock/skills) (`grill-me` / `to-spec`) — credit to Matt Pocock for the original workflow design. This version keeps a mandatory "Proposed Modules to Modify" section in the PRD that the upstream version deliberately omits, and writes to a local file by default instead of an issue tracker.
- `Council` composes personas by writing them directly into subagent prompts — no separate agent-authoring tool required, just Claude Code's built-in Task/subagent capability.

## License

MIT — see [LICENSE](LICENSE).
