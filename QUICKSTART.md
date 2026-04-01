# Slack Bridge Quickstart

## First time / after reboot

```bash
claude-slack-bridge start                    # start the daemon
tmux new -s claude                    # start a tmux session
claude --dangerously-skip-permissions # start Claude inside it
```

That's it. Three commands.

## The `claude-slack-bridge` command

```bash
claude-slack-bridge start     # start the daemon
claude-slack-bridge stop      # stop the daemon
claude-slack-bridge restart   # stop + start (after code changes)
claude-slack-bridge status    # check daemon, API, and tmux
claude-slack-bridge logs      # tail the daemon log
```

## tmux basics

```bash
tmux new -s claude       # create a new session named "claude"
tmux attach -t claude    # reattach to an existing session
tmux kill-session -t claude  # kill the session (stops Claude)
```

**Detach from tmux:** Press `Ctrl+B` then `D`

This disconnects your terminal but leaves Claude running in the background.

## The magic: Claude survives without a terminal

When you detach from tmux (or close the terminal entirely), both the daemon and Claude keep running. You can:

- Close every terminal window
- Close your laptop lid (as long as it doesn't sleep)
- Walk away and use Slack from your phone

Claude is still alive, still connected to hardware, still responding to Slack messages. The only things that kill it are: reboot, `tmux kill-session -t claude`, or exiting Claude inside the session.
