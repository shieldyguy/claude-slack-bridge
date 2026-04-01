// test/mcp-server.test.js
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { handleSend, handleUpdate, handleReact, handleHistory } from '../src/mcp-server.js';

// Spin up a fake daemon HTTP server for tests
let fakeDaemon;
let daemonPort;
let lastRequest;

function startFakeDaemon() {
  return new Promise((resolve) => {
    fakeDaemon = createServer(async (req, res) => {
      const chunks = [];
      req.on('data', (c) => chunks.push(c));
      req.on('end', () => {
        const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
        lastRequest = { method: req.method, url: req.url, body };

        if (req.url === '/send') {
          res.end(JSON.stringify({ ok: true, ts: '111.222' }));
        } else if (req.url === '/update') {
          res.end(JSON.stringify({ ok: true, ts: body.ts }));
        } else if (req.url === '/react') {
          res.end(JSON.stringify({ ok: true }));
        } else if (req.url.startsWith('/history')) {
          res.end(JSON.stringify({ ok: true, messages: [{ ts: '1.1', user: 'U1', text: 'hi' }] }));
        }
      });
    });
    fakeDaemon.listen(0, '127.0.0.1', () => {
      daemonPort = fakeDaemon.address().port;
      resolve();
    });
  });
}

before(async () => await startFakeDaemon());
after(() => fakeDaemon.close());

describe('handleSend', () => {
  it('sends text and returns timestamp', async () => {
    const baseUrl = `http://127.0.0.1:${daemonPort}`;
    const result = await handleSend(baseUrl, { text: 'hello' });
    assert.ok(result.content[0].text.includes('111.222'));
    assert.equal(lastRequest.body.text, 'hello');
  });

  it('includes persona when provided', async () => {
    const baseUrl = `http://127.0.0.1:${daemonPort}`;
    await handleSend(baseUrl, { text: 'hi', persona: { name: 'CCB', emoji: ':satellite:' } });
    assert.equal(lastRequest.body.persona.name, 'CCB');
    assert.equal(lastRequest.body.persona.emoji, ':satellite:');
  });
});

describe('handleUpdate', () => {
  it('sends update request', async () => {
    const baseUrl = `http://127.0.0.1:${daemonPort}`;
    const result = await handleUpdate(baseUrl, { ts: '111.222', text: 'updated' });
    assert.ok(result.content[0].text.includes('updated'));
  });
});

describe('handleReact', () => {
  it('sends react request', async () => {
    const baseUrl = `http://127.0.0.1:${daemonPort}`;
    const result = await handleReact(baseUrl, { ts: '111.222', emoji: 'thumbsup' });
    assert.ok(result.content[0].text.includes('thumbsup'));
  });
});

describe('handleHistory', () => {
  it('returns messages', async () => {
    const baseUrl = `http://127.0.0.1:${daemonPort}`;
    const result = await handleHistory(baseUrl, {});
    assert.ok(result.content[0].text.includes('hi'));
  });
});
