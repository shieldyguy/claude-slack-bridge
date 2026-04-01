import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { shouldForwardMessage } from '../src/inbound.js';

describe('shouldForwardMessage', () => {
  const channelId = 'C07ABC123';

  it('forwards normal human message in target channel', () => {
    const event = { channel: channelId, text: 'hello', bot_id: undefined, subtype: undefined };
    assert.equal(shouldForwardMessage(event, channelId), true);
  });

  it('rejects bot messages', () => {
    const event = { channel: channelId, text: 'hello', bot_id: 'B123', subtype: undefined };
    assert.equal(shouldForwardMessage(event, channelId), false);
  });

  it('rejects messages from other channels', () => {
    const event = { channel: 'C_OTHER', text: 'hello', bot_id: undefined, subtype: undefined };
    assert.equal(shouldForwardMessage(event, channelId), false);
  });

  it('rejects message_changed subtypes', () => {
    const event = { channel: channelId, text: 'hello', bot_id: undefined, subtype: 'message_changed' };
    assert.equal(shouldForwardMessage(event, channelId), false);
  });

  it('rejects channel_join subtypes', () => {
    const event = { channel: channelId, text: 'joined', bot_id: undefined, subtype: 'channel_join' };
    assert.equal(shouldForwardMessage(event, channelId), false);
  });

  it('rejects messages with no text', () => {
    const event = { channel: channelId, text: undefined, bot_id: undefined, subtype: undefined };
    assert.equal(shouldForwardMessage(event, channelId), false);
  });

  it('rejects empty string messages', () => {
    const event = { channel: channelId, text: '', bot_id: undefined, subtype: undefined };
    assert.equal(shouldForwardMessage(event, channelId), false);
  });
});
