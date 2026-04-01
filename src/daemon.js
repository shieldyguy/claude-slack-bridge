// src/daemon.js
import { createServer } from 'node:http';
import pkg from '@slack/bolt';
const { App } = pkg;
import { shouldForwardMessage } from './inbound.js';
import { injectMessage } from './tmux.js';

// --- Config ---
const BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const APP_TOKEN = process.env.SLACK_APP_TOKEN;
const CHANNEL_ID = process.env.SLACK_CHANNEL_ID;
const TMUX_SESSION = process.env.TMUX_SESSION || 'claude';
const BRIDGE_PORT = parseInt(process.env.BRIDGE_PORT || '3271', 10);

if (!BOT_TOKEN || !APP_TOKEN || !CHANNEL_ID) {
  console.error('Missing required env vars: SLACK_BOT_TOKEN, SLACK_APP_TOKEN, SLACK_CHANNEL_ID');
  process.exit(1);
}

// --- Slack App ---
const app = new App({
  token: BOT_TOKEN,
  socketMode: true,
  appToken: APP_TOKEN,
  logLevel: 'ERROR',
});

// Inbound: Slack → tmux
app.event('message', async ({ event }) => {
  if (!shouldForwardMessage(event, CHANNEL_ID)) return;

  const result = await injectMessage(TMUX_SESSION, event.text);

  if (!result.success) {
    await app.client.chat.postMessage({
      channel: CHANNEL_ID,
      text: `Claude is offline — ${result.reason}. Start a session with \`tmux new -s ${TMUX_SESSION}\``,
    });
  }
});

// --- HTTP API for MCP server ---
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

const httpServer = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${BRIDGE_PORT}`);

    if (req.method === 'GET' && url.pathname === '/health') {
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/send') {
      const body = await readBody(req);
      const params = { channel: CHANNEL_ID, text: body.text };
      if (body.persona) {
        params.username = body.persona.name;
        if (body.persona.emoji) params.icon_emoji = body.persona.emoji;
      }
      if (body.thread_ts) params.thread_ts = body.thread_ts;
      const result = await app.client.chat.postMessage(params);
      sendJson(res, 200, { ok: true, ts: result.ts });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/update') {
      const body = await readBody(req);
      await app.client.chat.update({ channel: CHANNEL_ID, ts: body.ts, text: body.text });
      sendJson(res, 200, { ok: true, ts: body.ts });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/react') {
      const body = await readBody(req);
      await app.client.reactions.add({ channel: CHANNEL_ID, timestamp: body.ts, name: body.emoji });
      sendJson(res, 200, { ok: true });
      return;
    }

    if (req.method === 'GET' && url.pathname === '/history') {
      const params = { channel: CHANNEL_ID };
      const count = url.searchParams.get('count');
      const sincets = url.searchParams.get('since_ts');
      if (count) params.limit = parseInt(count, 10);
      if (sincets) params.oldest = sincets;
      const result = await app.client.conversations.history(params);
      const messages = result.messages.map((m) => ({
        ts: m.ts,
        user: m.user || null,
        bot_id: m.bot_id || null,
        text: m.text,
      }));
      sendJson(res, 200, { ok: true, messages });
      return;
    }

    sendJson(res, 404, { error: 'Not found' });
  } catch (err) {
    console.error('[daemon] HTTP error:', err.message);
    sendJson(res, 500, { error: err.message });
  }
});

// --- Start ---
async function main() {
  await app.start();
  console.log(`[slack-bridge] Slack connected via Socket Mode`);

  httpServer.listen(BRIDGE_PORT, '127.0.0.1', () => {
    console.log(`[slack-bridge] HTTP API on http://127.0.0.1:${BRIDGE_PORT}`);
    console.log(`[slack-bridge] tmux target: ${TMUX_SESSION}`);
    console.log(`[slack-bridge] Channel: ${CHANNEL_ID}`);
  });
}

main().catch((err) => {
  console.error('[slack-bridge] Fatal:', err);
  process.exit(1);
});
