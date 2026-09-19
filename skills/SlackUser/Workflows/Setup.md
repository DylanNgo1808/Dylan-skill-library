# Setup Workflow

Get the personal Slack token in place and verify it, without ever exposing it.

## Voice Notification

```bash
curl -s -X POST http://localhost:31337/notify \
  -H "Content-Type: application/json" \
  -d '{"message": "Running the Setup workflow in the SlackUser skill to verify Slack access"}' \
  > /dev/null 2>&1 &
```

Running the **Setup** workflow in the **SlackUser** skill to verify Slack access...

## Step 1: Check whether setup is already done

```bash
bun ~/.claude/skills/SlackUser/Tools/SlackUser.ts auth
```

Success prints the authenticated user ID, workspace, and current sending mode — setup is done, stop here. Any error tells you which step below to run.

## Step 2: Token resolution order

The tool looks in this order and uses the first hit:

| Order | Source | Notes |
|-------|--------|-------|
| 1 | `SLACK_USER_TOKEN` env var | Best for one-off runs; never bake it into a script |
| 2 | `~/.claude/.env` | Canonical secrets location — the default place to put it |
| 3 | `<skill>/.env.local` | Self-contained alternative, mode 600 |
| — | `SLACK_USER_CONFIG_FILE` | Overrides 2 and 3 with an explicit path |

Any token file must be mode `600`; the tool refuses looser permissions rather than reading it.

## Step 3: Install the token (the principal does this, not you)

Do not ask them to paste the token into chat. Have them run one of these themselves:

```sh
# Canonical location
printf 'SLACK_USER_TOKEN=xoxp-...\n' >> ~/.claude/.env && chmod 600 ~/.claude/.env

# Or skill-local
printf 'SLACK_USER_TOKEN=xoxp-...\n' > ~/.claude/skills/SlackUser/.env.local
chmod 600 ~/.claude/skills/SlackUser/.env.local
```

If they already keep a `xoxp-` token elsewhere (another agent's skill directory, a password manager export), point `SLACK_USER_CONFIG_FILE` at that file instead of copying the secret to a second location.

The token comes from a Slack app with **user token scopes** — typically `channels:history`, `groups:history`, `im:history`, `mpim:history`, `channels:read`, `groups:read`, `im:read`, `users:read`, plus `chat:write` only if sending is wanted at all. `users:read` is what turns `U…` IDs into names in the remembered directory; add `users:read.email` too if the principal wants to address people by email. Install to the workspace and copy the User OAuth Token.

## Step 4: Verify, read-only

```bash
bun ~/.claude/skills/SlackUser/Tools/SlackUser.ts auth
bun ~/.claude/skills/SlackUser/Tools/SlackUser.ts list --limit 20
```

Never verify with a send. A "just testing" message is a real notification to a real person.

## Step 5: Prime the directory

```bash
bun ~/.claude/skills/SlackUser/Tools/SlackUser.ts who --refresh
```

Reads every conversation and workspace member into `data/directory.json` so names resolve from the first real request onward instead of costing a lookup each. Read-only, and it cannot send. If names come back empty here, the token is missing `users:read` — fix that now rather than discovering it mid-summary.

## Errors

| Error | Meaning | Action |
|-------|---------|--------|
| `invalid_auth` / `token_revoked` | Token dead or rotated | Ask them to reissue in Slack app settings |
| `not_authed` | No token found | Step 3 |
| `must use mode 600` | Token file world/group-readable | `chmod 600 <file>` |
| `missing_scope` | Scope not granted | Name the exact scope Slack asked for and stop — do not retry with a broader call or a different credential |
| `must use a personal user token` | A `xoxb-` bot token was supplied | Wrong skill — bot posting belongs to slack-file-sender or the slack MCP tools |
