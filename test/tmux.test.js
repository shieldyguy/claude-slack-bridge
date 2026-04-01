import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildInjectCommands } from '../src/tmux.js';

describe('buildInjectCommands', () => {
  it('returns load-buffer, paste-buffer, and send-keys Enter sequence', () => {
    const cmds = buildInjectCommands('claude', '/tmp/test-msg');
    assert.equal(cmds.length, 3);
    assert.deepEqual(cmds[0], ['load-buffer', '/tmp/test-msg']);
    assert.deepEqual(cmds[1], ['paste-buffer', '-t', 'claude']);
    assert.deepEqual(cmds[2], ['send-keys', '-t', 'claude', 'Enter']);
  });
});
