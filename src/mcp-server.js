// src/mcp-server.js
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import http from 'node:http';

const BRIDGE_URL = process.env.BRIDGE_URL || 'http://127.0.0.1:3271';

// --- HTTP helpers ---

function postJson(baseUrl, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const data = JSON.stringify(body);
    const req = http.request(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString()));
        } catch (e) {
          reject(new Error(`Invalid JSON from daemon: ${Buffer.concat(chunks).toString()}`));
        }
      });
    });
    req.on('error', (e) => reject(new Error(`Daemon unreachable at ${baseUrl}: ${e.message}. Is start-bridge.sh running?`)));
    req.end(data);
  });
}

function getJson(baseUrl, path) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    http.get(url, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString()));
        } catch (e) {
          reject(new Error(`Invalid JSON from daemon`));
        }
      });
    }).on('error', (e) => reject(new Error(`Daemon unreachable at ${baseUrl}: ${e.message}. Is start-bridge.sh running?`)));
  });
}

// --- Tool handlers (exported for testing) ---

export async function handleSend(baseUrl, args) {
  const result = await postJson(baseUrl, '/send', args);
  return { content: [{ type: 'text', text: `Message sent (ts: ${result.ts})` }] };
}

export async function handleUpdate(baseUrl, args) {
  await postJson(baseUrl, '/update', args);
  return { content: [{ type: 'text', text: `Message updated (ts: ${args.ts}): ${args.text}` }] };
}

export async function handleReact(baseUrl, args) {
  await postJson(baseUrl, '/react', args);
  return { content: [{ type: 'text', text: `Reaction :${args.emoji}: added to ${args.ts}` }] };
}

export async function handleHistory(baseUrl, args) {
  const params = new URLSearchParams();
  if (args.count) params.set('count', args.count.toString());
  if (args.since_ts) params.set('since_ts', args.since_ts);
  const qs = params.toString();
  const result = await getJson(baseUrl, `/history${qs ? '?' + qs : ''}`);
  const lines = result.messages.map(
    (m) => `[${m.ts}] ${m.bot_id ? '(bot)' : `<@${m.user}>`}: ${m.text}`
  );
  return { content: [{ type: 'text', text: lines.join('\n') || 'No messages found.' }] };
}

// --- MCP Server setup ---

const server = new McpServer({
  name: 'claude-slack-bridge',
  version: '0.1.0',
});

server.tool(
  'slack_send',
  'Post a message to Slack. Use persona to post as a named entity (e.g. hardware board, service).',
  {
    text: z.string().describe('Message text'),
    persona: z.object({
      name: z.string().describe('Display name (e.g. "CCB", "Claude")'),
      emoji: z.string().optional().describe('Icon emoji (e.g. ":satellite:")'),
    }).optional().describe('Post as this persona instead of default bot'),
    thread_ts: z.string().optional().describe('Reply in thread (message timestamp)'),
  },
  async (args) => handleSend(BRIDGE_URL, args)
);

server.tool(
  'slack_update',
  'Edit a previously sent Slack message in place. Use for progress updates.',
  {
    ts: z.string().describe('Timestamp of message to update'),
    text: z.string().describe('New message text'),
  },
  async (args) => handleUpdate(BRIDGE_URL, args)
);

server.tool(
  'slack_react',
  'Add an emoji reaction to a Slack message.',
  {
    ts: z.string().describe('Timestamp of message to react to'),
    emoji: z.string().describe('Emoji name without colons (e.g. "thumbsup")'),
  },
  async (args) => handleReact(BRIDGE_URL, args)
);

server.tool(
  'slack_history',
  'Read recent messages from the Slack channel.',
  {
    count: z.number().optional().describe('Number of messages to fetch (default 10)'),
    since_ts: z.string().optional().describe('Only messages after this timestamp'),
  },
  async (args) => handleHistory(BRIDGE_URL, args)
);

// --- Start ---
// Only connect transport when run as a process (not when imported for testing)
if (process.argv[1] && process.argv[1].endsWith('mcp-server.js')) {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
