/**
 * Determine if a Slack message event should be forwarded to Claude.
 * Only forwards: human messages, in the target channel, with text content.
 * Rejects: bot messages, subtypes (edits, joins, etc.), other channels, empty text.
 */
export function shouldForwardMessage(event, targetChannelId) {
  if (!event.text) return false;
  if (event.bot_id) return false;
  if (event.subtype) return false;
  if (event.channel !== targetChannelId) return false;
  return true;
}
