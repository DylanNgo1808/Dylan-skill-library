---
name: SlackUser
description: "Personal Slack access with the principal's own user token (xoxp-) — read, search, and summarize channels and DMs as the human, and send messages only through an explicit, persistent sending on/off switch enforced on disk. Remembers every person and conversation it touches in a local directory, so a name said once resolves with no API call and no guessing afterward. Tools/SlackUser.ts wraps auth, sending status|on|off, who (remembered people and channels), list (resolve #names to conversation IDs), pull (conversations.history), thread (conversations.replies), and send (chat.postMessage). Sending defaults to off and stays off until the principal explicitly asks to turn it on; drafting, summarizing, or merely discussing Slack is never permission to send. USE WHEN read my Slack, check Slack, pull Slack messages, what did they say in Slack, summarize this Slack channel, catch me up on Slack, read my DMs, Slack thread, find a Slack channel, who is this Slack user, who do I know on Slack, DM the person I messaged last time, send a Slack message as me, DM someone as me, Slack sending mode, turn Slack sending on or off. NOT FOR sending a file or attachment through the shared workspace bot (use slack-file-sender), NOT FOR bot-token posting where the message should appear from an app rather than the principal (use the slack MCP tools), NOT FOR non-Slack chat platforms."
effort: low
---

# SlackUser

Personal Slack, read-first. Everything runs through `Tools/SlackUser.ts` with the principal's own user token, so reads see exactly what they see — private channels, group DMs, direct messages — and any message sent goes out under **their name**, not a bot's. That asymmetry is why sending is gated.

## Customization

**Before executing, check for user customizations at:**
`~/.claude/LIFEOS/USER/SKILLCUSTOMIZATIONS/SlackUser/`

If it exists, load PREFERENCES.md (e.g. default channels, summary format). Otherwise proceed with defaults.

## Voice Notification

**When executing a workflow, do BOTH:**

1. **Send voice notification**:
   ```bash
   curl -s -X POST http://localhost:31337/notify \
     -H "Content-Type: application/json" \
     -d '{"message": "Running the WORKFLOWNAME workflow in the SlackUser skill to ACTION"}' \
     > /dev/null 2>&1 &
   ```

2. **Output text notification**:
   ```
   Running the **WorkflowName** workflow in the **SlackUser** skill to ACTION...
   ```

## Workflow Routing

| Workflow | Trigger | File |
|----------|---------|------|
| **Setup** | "set up Slack", "Slack token", "auth Slack", `invalid_auth`, `missing_scope` | `Workflows/Setup.md` |
| **Read** | "read my Slack", "catch me up", "summarize this channel", "check my DMs", "find that thread" | `Workflows/Read.md` |
| **Send** | "send this in Slack as me", "reply in that thread", "turn Slack sending on/off" | `Workflows/Send.md` |
| **Who** | "who is U…", "who do I know on Slack", "who did I message last", an unrecognized name | `Workflows/Who.md` |

## Never guess a name

Every `list`, `pull`, `thread`, and `send` writes what it learned — user IDs, display names, handles, emails, DM channel IDs, channel names, and when each was last pulled or sent to — into `data/directory.json`. That file is the answer to "who is `U054M84DHB6`?" and to "which conversation did they mean by *kenny*?".

The rule that follows: **resolve from memory or from Slack, never from inference.** If `who` and a `list` both come up empty for a name, say so and ask — do not map it onto the closest-looking person. A wrong `U…` in a summary is a misattributed quote; a wrong `U…` in a send is a message to a stranger.

The tool enforces the safe half of this itself: a name matching two or more people fails with both candidates listed rather than picking one, and unnamed IDs surface as `"unresolved"` in `pull` output instead of being dressed up as names.

## Sending policy (non-negotiable)

The gate is a file on disk, not a judgment call. `send` reads it before every call and refuses when it says `off`.

- Treat sending as **off** unless `sending status` prints `on`.
- Run `sending on` / `sending off` **only** when the principal explicitly asks to change that setting. Never flip it to unblock yourself.
- Even with sending on, send only when the principal explicitly asks to send **and** names a recipient/conversation and the content. Drafting, summarizing, pulling, or discussing Slack is never permission to send.
- If sending is off, say so and explain they can turn it on. Do not turn it on and do not offer a workaround through another skill or MCP tool.
- Show the exact channel and full message text and get an explicit OK before every send. There is no undo that removes the notification already delivered.

## Quick Reference

```bash
SLACK="$HOME/.claude/skills/SlackUser/Tools/SlackUser.ts"
bun "$SLACK" auth                                              # who am I, is sending on, how much is remembered?
bun "$SLACK" sending status
bun "$SLACK" who --query "kenny"                               # what do we already know? no API call
bun "$SLACK" who --refresh                                     # re-read the workspace into memory
bun "$SLACK" list --query "eng"                                # find conversation IDs by name
bun "$SLACK" pull --channel "@kenny" --limit 50                # newest-first history, authors named
bun "$SLACK" thread --channel "#general" --ts "1712345678.000100"
bun "$SLACK" send --channel "#general" --text "..."            # blocked unless sending is on
```

`--channel` takes a conversation ID (`C…`/`D…`/`G…`), a `#name`, an `@person`, a remembered name, or an email. Anything resolved once is free afterward. Full flag reference: `Tools/SlackUser.help.md`.

## Examples

**Example 1: Catch up on a channel**
```
User: "What did I miss in #product-eng today?"
→ Invokes Read workflow
→ pull --channel "#product-eng" --oldest <today 00:00 epoch>
→ Resolves from the directory (or learns and caches it on a first miss)
→ Summarizes by topic using the returned `people` map for names, flagging
  unanswered questions and anything addressed to the principal
```

**Example 2: A name learned once, reused later**
```
Week 1 — User: "Pull my DMs with Kenny."
→ Not in memory yet: one conversation list resolves @kenny → D…, and
  users.info names him. Both are written to data/directory.json.

Week 3 — User: "DM Kenny that the report is ready."
→ Zero resolution calls. who --query kenny confirms Kenny (U01NCB7NX6F, DM D…)
→ Confirmation shows the resolved human, then the gate decides whether it sends
```

**Example 3: Send blocked by the gate**
```
User: "Tell Sam in Slack that the deploy is done."
→ Invokes Send workflow
→ sending status → off
→ Reports: sending is off, nothing was sent, and they can authorize it with "turn Slack sending on"
→ Does NOT flip the switch, does NOT route around it via slack-file-sender or the slack MCP tools
```

**Example 4: Authorized send**
```
User: "Turn Slack sending on." → sending on
User: "Now DM Sam: deploy is live on prod."
→ Shows the resolved conversation and the exact text, waits for OK
→ send --channel "@sam" --text "Deploy is live on prod."
→ Confirms with the returned timestamp
```

## Gotchas

- **The gate persists across sessions.** `.sending-mode` lives beside the tool and survives restarts. If a past session left it `on`, it is still `on` — check `sending status` before assuming, and never treat a stale `on` as this session's permission.
- **A user token is not a bot token.** The tool rejects anything not starting with `xoxp-`. A `xoxb-` token belongs to `slack-file-sender` / the slack MCP tools, which post as an app, not as the principal.
- **Token files must be mode 600.** The tool refuses to read a token file with looser permissions rather than silently using it. Fix with `chmod 600`, don't work around it.
- **Never print, echo, or `cat` the token.** Not into a command line, not into a log, not into a summary. Pass it by env var or let the tool read the file itself.
- **`missing_scope` is terminal.** State the scope Slack asked for and stop. Do not retry with a broader method or a different credential — the fix is re-authorizing the token in Slack's app settings.
- **`conversations.history` returns newest-first.** Reverse before summarizing chronologically, or the recap reads backwards.
- **A name costs one API call the first time and nothing after.** The miss path runs a conversation list, caches everything it saw, and retries the lookup. Do not "help" by pre-resolving with `list` — just pass the name.
- **`--channel` only resolves conversations the principal is a *member* of.** Public channels they haven't joined resolve to nothing even after a refresh — use the raw ID.
- **Thread replies are not in channel history.** A parent message with `reply_count > 0` needs `thread --ts <parent ts>`; summarizing without it silently drops most of the discussion.
- **`"unresolved"` in the `people` map means Slack would not name that ID** — usually a deactivated account or a token without `users:read`. Report it as an unresolved ID. It is retried at most once a week, so a name that never appears is a scope problem to fix in Setup, not something to re-run.
- **The directory is a cache, not a source of truth.** Display names change, people leave. If a name looks stale or a send is going somewhere important, `who --refresh` before trusting it.
- **`--channel "@person"` opens a DM if none exists.** Opening notifies nobody, but it does place the conversation in the principal's sidebar. It never sends anything — the sending gate is upstream of message posting, not of DM creation.
- **Never send while testing.** Validate configuration with `auth`, `sending status`, and `list`. A "test message" is still a real notification on someone's phone.
