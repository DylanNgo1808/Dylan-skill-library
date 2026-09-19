# SlackUser setup

Read Slack as yourself with a personal user token (`xoxp-`). Sending is off until you turn it on. Do not paste the token into chat, a commit, or this file.

The agent-facing version of this guide is [Workflows/Setup.md](Workflows/Setup.md).

## Requirements

- [Bun](https://bun.sh) (`bun --version`)
- A Slack app installed on the workspace, with a **User OAuth Token** (`xoxp-…`, not a bot `xoxb-` token)

## 1. Create the Slack app and grant scopes

In [api.slack.com/apps](https://api.slack.com/apps): create an app (or reuse one), add **User Token Scopes**, install it to the workspace, and copy the **User OAuth Token**.

Read scopes (required):

- `channels:history`, `groups:history`, `im:history`, `mpim:history`
- `channels:read`, `groups:read`, `im:read`
- `users:read` — turns `U…` IDs into names
- `users:read.email` — optional; needed if you want to address people by email

Write scope (only if you want sending at all):

- `chat:write`

## 2. Store the token locally (mode 600)

Never commit this. The tool refuses to read a token file with looser permissions.

Canonical location:

```sh
printf 'SLACK_USER_TOKEN=xoxp-...\n' >> ~/.claude/.env && chmod 600 ~/.claude/.env
```

Or skill-local:

```sh
printf 'SLACK_USER_TOKEN=xoxp-...\n' > ~/.claude/skills/SlackUser/.env.local
chmod 600 ~/.claude/skills/SlackUser/.env.local
```

If the token already lives in another file, point `SLACK_USER_CONFIG_FILE` at that path instead of copying it.

Resolution order: `SLACK_USER_TOKEN` env var → `~/.claude/.env` → `<skill>/.env.local`.

## 3. Verify, read-only

```sh
SLACK="$HOME/.claude/skills/SlackUser/Tools/SlackUser.ts"
bun "$SLACK" auth
bun "$SLACK" list --limit 20
```

`auth` should print your user ID, workspace, and `Slack sending is off.` Never verify with a send — a test message is a real notification.

## 4. Prime the name directory

```sh
bun "$SLACK" who --refresh
```

This reads conversations and workspace members into `data/directory.json` so later name lookups do not hit Slack every time. If names come back empty, the token is missing `users:read`.

`data/directory.json` holds colleagues' names, emails, and channel IDs. It is personal data. It is gitignored and must stay off GitHub.

## 5. Sending stays off

```sh
bun "$SLACK" sending status   # off by default
bun "$SLACK" sending on       # only when you explicitly want outbound messages
bun "$SLACK" sending off
```

Even with sending on, the skill still shows the exact recipient and text and waits for an OK before posting. Posts go out under **your** name.

## Quick commands

```sh
bun "$SLACK" who --query "alex"                 # memory only, no API call
bun "$SLACK" pull --channel "#general" --limit 50
bun "$SLACK" thread --channel "#general" --ts "1712345678.000100"
bun "$SLACK" send --channel "#general" --text "..."   # blocked unless sending is on
```

Full flag reference: [Tools/SlackUser.help.md](Tools/SlackUser.help.md).

## Tests

```sh
cd ~/.claude/skills/SlackUser && bun test Tools/SlackUser.test.ts
```

No network. Cannot send.

## Errors

| Error | Fix |
|-------|-----|
| `not_authed` / no token found | Step 2 |
| `invalid_auth` / `token_revoked` | Reissue the User OAuth Token |
| `must use mode 600` | `chmod 600` the token file |
| `must use a personal user token` | You stored a bot `xoxb-` token; this skill needs `xoxp-` |
| `missing_scope` | Add the named scope on the Slack app and reinstall |
