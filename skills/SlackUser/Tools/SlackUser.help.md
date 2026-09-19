# SlackUser.ts — flag reference

```bash
bun ~/.claude/skills/SlackUser/Tools/SlackUser.ts <command> [flags]
```

Exit code `0` on success, `1` on any error (including a blocked send). Errors go to stderr; data goes to stdout as JSON.

## Commands

| Command | Slack method | Purpose |
|---------|--------------|---------|
| `auth` | `auth.test` | Verify the token; prints user, workspace, and sending mode |
| `sending [status\|on\|off]` | — | Read or set the persistent send gate |
| `list` | `users.conversations` | Enumerate/resolve conversations the principal belongs to |
| `pull` | `conversations.history` | Channel or DM history, newest-first |
| `thread` | `conversations.replies` | Replies under one parent message |
| `send` | `chat.postMessage` | Post as the principal — refuses unless sending is `on` |
| `who` | — (`--refresh`: `users.list` + `users.conversations`) | Read the remembered people/channel directory; `--refresh` re-reads the workspace into it |

## Flags

| Flag | Commands | Default | Notes |
|------|----------|---------|-------|
| `--channel` | pull, thread, send | required | Conversation ID (`C…`/`D…`/`G…`), `#name`, `@person`, remembered name, or email. Cache hit costs nothing; a miss costs one conversation list and is then remembered |
| `--refresh` | who | off | Re-read every conversation and workspace member into the directory |
| `--limit` | list, pull, thread | 200 (list), 100 (pull/thread) | Max 1000 for list, 100 for pull/thread |
| `--oldest` | pull, thread | — | Epoch seconds; start of range |
| `--latest` | pull, thread | — | Epoch seconds; end of range — use for backward pagination |
| `--inclusive` | pull, thread | off | Include messages exactly at `--oldest`/`--latest` |
| `--ts` | thread | required | Parent message timestamp |
| `--text` | send | required | Message body |
| `--thread` | send | — | Parent `ts` to reply under; omitted means a new top-level message |
| `--types` | list | `public_channel,private_channel,mpim,im` | Comma-separated |
| `--query` | list, who | — | Case-insensitive substring filter on the conversation name (`list`) or on any remembered name, handle, or email (`who`) |

Flags are validated per command — `pull` rejects `--text`, `send` rejects range flags, `thread` requires `--ts` and rejects `--thread`. A wrong flag fails loudly instead of being silently ignored.

## Environment

| Variable | Purpose |
|----------|---------|
| `SLACK_USER_TOKEN` | Token, highest precedence |
| `SLACK_USER_CONFIG_FILE` | Explicit token file path; overrides the default search |
| `SLACK_USER_MODE_FILE` | Override the sending-mode file location |
| `SLACK_USER_DIRECTORY_FILE` | Override the remembered people/channel directory location |

Token search order when `SLACK_USER_TOKEN` is unset: `SLACK_USER_CONFIG_FILE` → `~/.claude/.env` → `<skill>/.env.local`. Files must be mode `600` or the tool refuses to read them. Tokens must start with `xoxp-`.

## Directory

`data/directory.json` (mode 600), written on every `list`, `pull`, `thread`, `send`, and `who --refresh`.

```jsonc
{
  "version": 1,
  "people":   { "U…": { "id", "handle", "display_name", "real_name", "email",
                        "dm_channel", "is_bot", "first_seen", "last_seen",
                        "last_pulled", "last_sent", "lookup_failed_at" } },
  "channels": { "C…": { "id", "name", "kind", "user", "first_seen", "last_seen",
                        "last_pulled", "last_sent" } }
}
```

Merge-only: a later write never drops a field an earlier one learned. Lookup scans the records rather than a derived alias index, so nothing goes stale, and a name matching several people raises an error instead of resolving. On first run the file is seeded from `~/.claude/skills/slack-file-sender/data/contacts.json` if present. It holds names and emails but no tokens — still, treat it as personal data. Delete it to force a clean rebuild.

Scopes: name resolution needs `users:read`, and email lookup/display needs `users:read.email`. Without them the tool still works — people just stay `"unresolved"`, retried at most weekly per ID.

## Tests

```bash
cd ~/.claude/skills/SlackUser && bun test Tools/SlackUser.test.ts
```

Covers token extraction/validation, the sending-mode parser, per-command flag validation, and channel-ID recognition. No network calls — safe to run anytime, and it can never send.
