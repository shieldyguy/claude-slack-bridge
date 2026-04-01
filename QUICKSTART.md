# Slack Bridge Quickstart

## Start the bridge (once per reboot, or after killing it)

```bash
cd ~/Desktop/shieldy/MCP/claude-slack-bridge
./start-bridge.sh
```

## Start Claude in tmux

```bash
tmux new -s claude
claude --dangerously-skip-permissions
```

## Reattach to an existing tmux session

```bash
tmux attach -t claude
```

## Detach from tmux (leave Claude running)

Press `Ctrl+B` then `D`

## Check if the bridge is running

```bash
curl http://127.0.0.1:3271/health
```

## Stop the bridge

```bash
kill $(cat ~/Desktop/shieldy/MCP/claude-slack-bridge/bridge.pid)
```

## Restart the bridge (after code changes)

```bash
kill $(cat ~/Desktop/shieldy/MCP/claude-slack-bridge/bridge.pid)
cd ~/Desktop/shieldy/MCP/claude-slack-bridge
./start-bridge.sh
```
