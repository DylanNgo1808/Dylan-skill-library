---
name: Council
description: "Multi-agent collaborative debate that produces visible round-by-round transcripts with genuine intellectual friction. Council members are custom personas written inline for each topic — never generic built-in roles. Two workflows: DEBATE (3 rounds, full transcript + synthesis, parallel execution within rounds, ~1-2 min) and QUICK (1 round, fast perspective check, ~30s). Agents are designed per debate topic to create real disagreement; 4-6 well-composed personas outperform 12 generic ones. Council is collaborative-adversarial (debate to find the best path); for pure adversarial attack on an idea, red-team it instead. USE WHEN council, debate, multiple perspectives, weigh options, deliberate, get different views, multi-agent discussion, what would experts say, is there consensus, pros and cons from multiple angles."
---

# Council — Multi-Agent Debate

A council convenes custom-written personas to argue out a decision in visible rounds, instead of you just picking an answer alone. The value is in genuine friction — personas built for the specific topic pushing back on each other's actual points, not a generic pros/cons list.

## Core idea

Every council member is a **persona you write for this exact topic** — not a generic role like "the architect" or "the skeptic" pulled off a shelf. A debate about WebSockets vs SSE needs a real-time-systems persona, a frontend-DX persona, an ops-reliability persona, a research/precedent persona — each with a name, a domain angle, and a trait combination specific enough that they'd actually disagree.

Compose each persona as a short brief (2-4 sentences): name, domain expertise, and traits that shape how they argue (e.g. "skeptical and meticulous" vs "enthusiastic and pragmatic"). Then launch each persona as a subagent using Claude Code's Task tool (`general-purpose` subagent), with that brief baked into its prompt. No external tool is required — you write the persona directly into the prompt, every time, fresh for the topic at hand.

**Two workflows:**

| Workflow | Purpose | Rounds | Output | Time |
|----------|---------|--------|--------|------|
| **Debate** | Full structured discussion | 3 | Complete transcript + synthesis | 1-2 min |
| **Quick** | Fast perspective check | 1 | Initial positions only | ~30s |

## Composing personas

### Step 1 — Analyze the topic

Before writing any persona, decide what perspectives would create the most productive friction for *this specific* debate. Don't reach for generic roles — design roles around the topic.

**Example — "Should we use WebSockets or SSE?"**
- Real-time systems architect — technical, analytical, systematic
- Frontend DX advocate — UX-focused, enthusiastic, pragmatic
- Ops/reliability skeptic — technical, skeptical, cautious
- Industry researcher — comparative, thorough, evidence-driven

**Example — "Is AI overhyped?"**
- AI infrastructure builder — technical, enthusiastic, systematic
- Security practitioner skeptic — security-minded, skeptical, meticulous
- Pragmatic engineer — technical, pragmatic, analytical
- Evidence-based researcher — analytical, comparative, research-driven

### Step 2 — Default perspective slots

When the user doesn't specify council members, use these four slots as a starting point, with topic-specific traits substituted in:

| Slot | Purpose |
|------|---------|
| **Builder** | Has actually built things in this domain |
| **Skeptic** | Challenges assumptions, hunts for flaws |
| **Pragmatist** | Implementation reality, trade-offs, cost |
| **Analyst** | Data, precedent, external evidence |

### Step 3 — Write each persona brief

For each slot, write a 2-4 sentence persona brief: a name, their domain angle on this topic, and their argumentative style. This brief gets prepended to every round's prompt for that persona, so they stay in character across rounds.

```
You are Mara Solano, a real-time systems architect who has shipped WebSocket infrastructure at
scale. You're technical, analytical, and systematic — you think in failure modes and
message-ordering guarantees before anything else. You're debating: "Should we use WebSockets
or SSE?"
```

### Step 4 — Launch as subagents

Launch each persona as a `general-purpose` subagent via the Task tool, with the persona brief plus the round instructions (below) in the prompt. Launch all council members for a round **in parallel** — that's what keeps a 3-round, 4-person debate to 1-2 minutes instead of stacking sequential waits.

## Debate workflow (3 rounds)

### Round 1 — Initial positions

Launch all personas in parallel. Each gets: persona brief + full topic context + this instruction:

```
Give your initial position on this topic from your specialized perspective.
- Speak in first person as your character.
- Be specific and substantive (100-150 words).
- State your key concern, recommendation, or insight.
- You'll respond to other council members in Round 2.
```

Output each response as it completes under `### Round 1: Initial Positions`.

### Round 2 — Responses & challenges

Launch all personas again in parallel, this time each gets: persona brief + the full Round 1 transcript + this instruction:

```
Here's what the council said in Round 1: [transcript]

Now respond to the other council members:
- Reference specific points they made ("I disagree with [Name]'s point about X because...").
- Challenge assumptions or add nuance.
- Build on points you agree with.
- Maintain your specialized perspective.
- 100-150 words.

The value is in genuine intellectual friction — engage with their actual arguments.
```

### Round 3 — Synthesis

Launch all personas again, each gets: persona brief + Round 1 + Round 2 transcripts + this instruction:

```
Final synthesis from your perspective:
- Where does the council agree?
- Where do you still disagree with others?
- What's your final recommendation given the full discussion?
- 100-150 words.

Be honest about remaining disagreements — forced consensus is worse than acknowledged tension.
```

### Council synthesis

After all three rounds, write a short synthesis yourself:

```markdown
### Council Synthesis

**Areas of Convergence:**
- [Points where 3+ personas agreed]

**Remaining Disagreements:**
- [Points still contested]

**Recommended Path:**
[Your recommendation, weighing the arguments made]
```

## Quick workflow (1 round)

For a fast sanity check instead of a full debate: compose the same personas, launch them in parallel once with:

```
Give your immediate take from your specialized perspective:
- Key concern, insight, or recommendation.
- 30-50 words max.
- Be direct and specific.

This is a quick sanity check, not a full debate.
```

Then summarize:

```markdown
### Quick Summary

**Consensus:** [Do they generally agree? On what?]
**Concerns:** [Any red flags raised?]
**Recommendation:** [Proceed / Reconsider / Need full debate]
```

If the quick check reveals real disagreement or complex trade-offs, say so and suggest running the full Debate workflow instead.

## Output format

```markdown
## Council Debate: [Topic]

**Council Members:** [persona names + one-line trait summary each]

### Round 1: Initial Positions

**[Persona 1 Name] ([trait summary]):**
[Position]

[... all personas ...]

### Round 2: Responses & Challenges

**[Persona 1 Name]:**
[Response, engaging specific other personas by name]

[...]

### Round 3: Synthesis

**[Persona 1 Name]:**
[Final position]

[...]

### Council Synthesis

**Areas of Convergence:**
- ...

**Remaining Disagreements:**
- ...

**Recommended Path:**
...
```

**Requirements:** 100-150 words per persona per round (Debate), 30-50 words (Quick). Round 2+ must reference other personas by name and actual point — restating a Round 1 position without engagement is a failure mode. Personas should feel like they'd genuinely disagree, not converge instantly.

## Rules

- **Personas are written per-topic, never generic.** If you catch yourself reaching for "the architect" or "the skeptic" without topic-specific grounding, stop and design real personas first.
- **Use Quick for sanity checks, Debate for real decisions.**
- **4-6 personas beat 12.** More voices dilute the friction rather than sharpening it.
- **If all personas agree in Round 1, the topic may not need a council** — say so rather than manufacturing disagreement.
- **This is collaborative-adversarial, not pure attack.** The goal is the best path forward, not tearing the idea apart — for pure adversarial attack, run a red-team / devil's-advocate pass instead.

## Gotchas

- Debates need genuine disagreement to be valuable — check your persona design if every round converges instantly.
- Launching personas sequentially instead of in parallel turns a 1-2 minute debate into 5+ minutes for no benefit — always batch each round's Task calls together in one message.
- Keep persona briefs short (2-4 sentences). A long backstory burns tokens without sharpening the argument.
