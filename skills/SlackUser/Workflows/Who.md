# Who Workflow

Answer "who is this?" and "who do I know?" from remembered state. Read-only — never calls `send`.

## Voice Notification

```bash
curl -s -X POST http://localhost:31337/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running the Who workflow in the SlackUser skill to look up remembered Slack people"}' \
  > /dev/null 2>&1 &
```

Running the **Who** workflow in the **SlackUser** skill to look up remembered Slack people...

## When this runs

- The principal names someone and you need the conversation: `@kenny`, "Sam", "the person I DM'd yesterday".
- A `pull` came back with `"unresolved"` in its `people` map.
- The principal asks who a `U…` is, or who they talk to.
- A resolution failed and you are about to ask them — check here first.

Usually you do **not** need to run this workflow at all: `pull` and `send` resolve names themselves. Run it when you want to *show* the principal what is known, or to fix a resolution failure.

## Step 1: Ask memory first

```bash
SLACK="$HOME/.claude/skills/SlackUser/Tools/SlackUser.ts"
bun "$SLACK" who --query "kenny"
bun "$SLACK" who                     # everything, most recently contacted first
```

No token and no network needed. Returns people (`id`, `name`, `handle`, `email`, `dm`, `lastPulled`, `lastSent`) and channels, sorted by recency of contact — so "who did I message last" is the top of the people list.

On a first run with no directory yet, the answer is seeded from `slack-file-sender`'s contact cache, so people already known there are already known here.

## Step 2: Refresh only if memory misses

```bash
bun "$SLACK" who --refresh
```

Re-reads every conversation and every non-deleted workspace member into the directory. Needs the token and `users:read`. Do this when:

- A name the principal clearly expects to work is missing.
- Someone joined recently.
- A display name looks stale and it matters (before a send, say).

Do not refresh reflexively before every lookup. It is a full workspace scan; the cache exists so it stays rare.

## Step 3: Report, or stop

If exactly one person matches, use them and name them plainly: `Kenny (U01NCB7NX6F), DM D…`.

If several match, list the candidates and ask which one. Never pick the first. The tool enforces this too — an ambiguous `--channel` fails with the candidates rather than resolving.

If nothing matches after a refresh, say the name is not in the workspace as far as the token can see, and ask. Do not fall back to `slack-file-sender`'s cache, the slack MCP tools, or a guess from context.

## What gets remembered, and where

`data/directory.json` beside the tool, mode 600. Written on every `list`, `pull`, `thread`, `send`, and `who --refresh`:

| Kind | Remembered |
|------|------------|
| People | user ID, handle, display name, real name, email, DM channel, bot flag, last pulled, last sent |
| Channels | ID, `#name`, kind, last pulled, last sent |

It holds colleagues' names and email addresses — treat it as personal data. Never paste it into a message, a commit, or a summary that leaves this machine. It contains no tokens.

To forget everything and start clean:

```bash
rm ~/.claude/skills/SlackUser/data/directory.json
```

The next command rebuilds it from Slack.
