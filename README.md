# claude-slack-bridge

Bridge Claude Code terminal sessions with Slack. Two-way: inbound Slack messages get injected into your Claude Code tmux session, and Claude can post back to Slack as different personas (hardware boards, services, whatever).

## How it works

Two processes:
- **Daemon** (`start-bridge.sh`) — Runs in the background. Connects to Slack via Socket Mode, listens for messages, injects them into your tmux session. Also serves an HTTP API on localhost.
- **MCP server** (auto-started by Claude Code) — Gives Claude tools to post, update, and react in Slack. Calls the daemon's HTTP API.

## Prerequisites

- Node.js >= 18
- tmux (`brew install tmux`)
- A Slack workspace you control

## Slack App Setup (one-time)

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From Scratch**
2. Name it whatever you like (e.g. "Claude Bridge"), select your workspace
3. **Socket Mode:** Settings → Socket Mode → Enable. Create an app-level token with `connections:write` scope. Copy the `xapp-...` token.
4. **Bot Scopes:** OAuth & Permissions → Bot Token Scopes → Add:
   - `chat:write`
   - `chat:write.customize`
   - `channels:history`
   - `channels:read`
   - `reactions:write`
5. **Event Subscriptions:** Event Subscriptions → Enable → Subscribe to bot events → Add `message.channels`
6. **Install:** Install App → Install to Workspace. Copy the `xoxb-...` Bot Token.
7. **Channel:** Create a channel in Slack (e.g. `#claude-bench`). Invite the bot: `/invite @YourBotName`
8. **Channel ID:** Right-click the channel name → View channel details → copy the Channel ID at the bottom.

## Install

```bash
cd claude-slack-bridge
npm install
cp .env.example .env
# Edit .env with your tokens and channel ID
```

## Register MCP Server

Add to `~/.claude/settings.json` under `mcpServers`:

```json
{
  "slack-bridge": {
    "command": "node",
    "args": ["/absolute/path/to/claude-slack-bridge/src/mcp-server.js"],
    "env": {
      "BRIDGE_URL": "http://127.0.0.1:3271"
    }
  }
}
```

No Slack tokens in your Claude config — the daemon handles auth.

## Usage

1. Start the daemon: `./start-bridge.sh`
2. Start tmux: `tmux new -s claude`
3. Launch Claude Code: `claude --dangerously-skip-permissions`
4. Work normally. Use Slack when you want.

If you message in Slack while Claude is offline, the bot responds with instructions to start a tmux session.

## MCP Tools

| Tool | Description |
|------|-------------|
| `slack_send` | Post a message, optionally as a named persona |
| `slack_update` | Edit a previous message in place (for progress updates) |
| `slack_react` | Add an emoji reaction |
| `slack_history` | Read recent channel messages |
