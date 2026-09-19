# Read Workflow

Pull and summarize Slack conversations. Read-only — this workflow never calls `send`.

## Voice Notification

```bash
curl -s -X POST http://localhost:31337/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running the Read workflow in the SlackUser skill to pull Slack messages"}' \
  > /dev/null 2>&1 &
```

Running the **Read** workflow in the **SlackUser** skill to pull Slack messages...

## Step 1: Just name the conversation

Pass what the principal said straight to `pull` — a `#channel`, an `@person`, a bare name, an email, or an ID. `pull` resolves it against the remembered directory first, and falls back to Slack only on a miss, caching what it learns.

```bash
SLACK="$HOME/.claude/skills/SlackUser/Tools/SlackUser.ts"
bun "$SLACK" pull --channel "@kenny" --limit 50
```

You need `list` only when the principal is *browsing* ("what channels do I have?") rather than naming a target:

```bash
bun "$SLACK" list --query "product"
```

`--types` narrows it: `public_channel`, `private_channel`, `mpim`, `im` (comma-separated).

Two failures worth handling rather than working around:

- **Ambiguous name** — the tool refuses and lists the candidates. Ask which one; do not pick.
- **No match** — run `who --refresh` once (`Workflows/Who.md`), then ask. Never substitute a similar name.

## Step 2: Intent-to-flag mapping

| User says | Flags |
|-----------|-------|
| "what's new", "catch me up" | `--limit 50` |
| "today" | `--oldest "$(date -v0H -v0M -v0S +%s)"` (macOS) |
| "since yesterday" | `--oldest "$(date -v-1d +%s)"` |
| "last week" | `--oldest "$(date -v-7d +%s)"` |
| "everything", "full history" | `--limit 100`, then page with `--latest <oldest ts returned>` |
| "just the last few" | `--limit 10` |
| "that thread", "the replies" | `thread --ts <parent ts>` |
| "include the boundary message" | `--inclusive` |

Slack timestamps are epoch seconds with a fractional suffix (`1712345678.000100`). `--oldest`/`--latest` accept plain epoch seconds.

## Step 3: Pull

```bash
bun "$SLACK" pull --channel "#product-eng" --limit 50
```

Returns `{channel, channelName, hasMore, people, messages[]}`. Each message carries `user`, `text`, `ts`, and often `thread_ts` / `reply_count`.

`people` maps every author ID in the response to a name, resolved from memory and topped up from Slack for IDs seen for the first time. Use it for the recap — that is what it is for.

Two things to handle:

- **Order** — history comes back newest-first. Reverse it before writing a chronological recap.
- **Threads** — any message with `reply_count > 0` has content that is *not* in this response. Pull each thread that matters:

```bash
bun "$SLACK" thread --channel "#product-eng" --ts "1712345678.000100"
```

Skipping this silently drops most of the discussion on active channels. If more than a handful of threads are live, pull the ones with the highest `reply_count` and say which you skipped.

## Step 4: Paginate if `hasMore`

`hasMore: true` means the window was truncated. Page backwards by passing the oldest returned `ts` as `--latest`. Say so if you stopped early rather than implying you read everything.

## Step 5: Summarize

Default shape, unless they asked for something else:

- Group by topic or thread, not by timestamp.
- Lead with anything directed at the principal — mentions, direct questions, DMs.
- Flag open questions nobody answered and decisions that were made.
- Keep raw quotes for anything they may need to act on verbatim.
- Use the `people` map for names, not the raw `U…` IDs in `messages`. An entry reading `"unresolved"` stays an unresolved ID in the recap — say "an unresolved user (`U…`)" rather than inferring who it must be from context. Never invent a name for an ID.

## Boundary

If the summary leads somewhere ("should I reply?"), stop and hand back to `Workflows/Send.md`. Reading is never permission to send.
