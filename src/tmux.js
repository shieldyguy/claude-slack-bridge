import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';

const execFileAsync = promisify(execFile);

/**
 * Build the sequence of tmux commands for safe paste-buffer injection.
 * Returns array of arg arrays to pass to execFile('tmux', args).
 */
export function buildInjectCommands(session, tempFilePath) {
  return [
    ['load-buffer', tempFilePath],
    ['paste-buffer', '-t', session],
    ['send-keys', '-t', session, 'Enter'],
  ];
}

/**
 * Check if a tmux session exists.
 */
export async function isSessionAlive(session) {
  try {
    await execFileAsync('tmux', ['has-session', '-t', session]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Inject a message into a tmux session via paste-buffer.
 *
 * 1. Write message to a temp file (no shell escaping issues)
 * 2. tmux load-buffer <tempfile>  (loads content, no key interpretation)
 * 3. tmux paste-buffer -t <session>  (pastes as literal text)
 * 4. tmux send-keys -t <session> Enter  (submit the input)
 * 5. Delete temp file
 *
 * Returns { success: true } or { success: false, reason: string }.
 */
export async function injectMessage(session, rawText) {
  const alive = await isSessionAlive(session);
  if (!alive) {
    return { success: false, reason: `tmux session "${session}" not found` };
  }

  const tempFile = join(tmpdir(), `slack-bridge-${randomBytes(6).toString('hex')}`);

  try {
    await writeFile(tempFile, rawText, 'utf-8');
    const cmds = buildInjectCommands(session, tempFile);
    for (const args of cmds) {
      await execFileAsync('tmux', args);
    }
    return { success: true };
  } catch (err) {
    return { success: false, reason: err.message };
  } finally {
    try { await unlink(tempFile); } catch { /* ignore cleanup errors */ }
  }
}
