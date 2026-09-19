# Send Workflow

Send a Slack message **as the principal**, and manage the sending gate.

Messages posted here are indistinguishable from ones the principal typed. There is no undo that removes the notification already delivered. Treat every send as irreversible outbound communication.

## Voice Notification

```bash
curl -s -X POST http://localhost:31337/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running the Send workflow in the SlackUser skill to send a Slack message"}' \
  > /dev/null 2>&1 &
```

Running the **Send** workflow in the **SlackUser** skill to send a Slack message...

## Step 0: Is this actually a send request?

Send only when the principal explicitly asks to send **and** supplies a recipient/conversation and content. Everything below is a *no*:

- "Draft a reply to Sam" → write the draft, stop.
- "What should I tell them?" → answer, stop.
- "Can you handle this Slack thread?" → ambiguous; ask what "handle" means before touching send.
- "Summarize and follow up" → summarize, then ask whether to send.

## Step 1: Check the gate

```bash
SLACK="$HOME/.claude/skills/SlackUser/Tools/SlackUser.ts"
bun "$SLACK" sending status
```

**If `off`:** stop. Report that sending is off, that nothing was sent, and that they can authorize it by asking to turn Slack sending on. Do not run `sending on` yourself. Do not route around the gate with `slack-file-sender`, the slack MCP tools, or a browser session — the gate exists to stop exactly that.

**If `on`:** it may be left over from an earlier session. A stale `on` is not this session's permission — Step 3 confirmation is still required.

## Step 2: Changing the gate

Run these **only** when the principal explicitly asks to change the setting:

```bash
bun "$SLACK" sending on
bun "$SLACK" sending off
```

The mode persists to `.sending-mode` beside the tool and survives restarts. If they turn it on for one message, offer to turn it back off afterward.

## Step 3: Confirm before sending

Resolve the target first — `bun "$SLACK" who --query "<name>"` — so you confirm against a real person or conversation, not a guess. If memory misses, `who --refresh`; if it is still ambiguous or empty, ask. Never send to a best guess: this posts under the principal's own name.

Then show, and wait for an explicit OK:

```
To:      #product-eng  (C0123456789)
Thread:  reply to Sam's 14:32 message  (or: new top-level message)
Text:
  <the exact message, verbatim>
```

For a DM, show the resolved human, not just the ID: `To: @Kenny (U01NCB7NX6F, DM D0123456789)`. A `D…` alone gives them nothing to check, and checking the recipient is the entire point of this step.

Re-confirm if anything changes after approval. Approval covers one message to one conversation — it does not roll forward to a follow-up, a retry, or a second recipient.

Sanity checks before you ask: right conversation (DM vs public channel), no unintended `@channel`/`@here`, no content from this session that shouldn't leave it.

## Step 4: Send

```bash
bun "$SLACK" send --channel "C0123456789" --text "Message text"
bun "$SLACK" send --channel "C0123456789" --text "Reply text" --thread "1712345678.000100"
```

`--thread` takes the **parent** message `ts`. Without it, a reply lands in the channel as a new top-level message — visible to everyone and out of context.

## Step 5: Report

Confirm what went where, with the returned timestamp. Report failures verbatim and do not retry a send that may have partially succeeded — pull the conversation and check whether the message actually landed before trying again.

## Errors

| Error | Meaning | Action |
|-------|---------|--------|
| `Slack sending is off` | The gate blocked it; nothing was sent | Step 1 — ask, don't flip |
| `channel_not_found` | Bad ID, or not a member | `who --query` then `list --query` to resolve |
| `matches N people` | The name was ambiguous; nothing was sent | Show the candidates and ask which one |
| `not_in_channel` | Must join the channel first | Ask them to join; do not auto-join |
| `missing_scope` | Token lacks `chat:write` | Name the scope and stop |
| `msg_too_long` | Over 40,000 characters | Ask whether to split or trim |
| `ratelimited` | Too many posts | Wait for `Retry-After`; do not loop |
