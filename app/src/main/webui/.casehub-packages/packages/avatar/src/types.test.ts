import { describe, it, expect } from 'vitest';
import type { VisemeFrame, ConversationTurn, AvatarMessage } from './types.js';

describe('Avatar types', () => {
  it('VisemeFrame has required fields', () => {
    const frame: VisemeFrame = { viseme: 'aa', startMs: 0, endMs: 80 };
    expect(frame.viseme).toBe('aa');
    expect(frame.startMs).toBe(0);
    expect(frame.endMs).toBe(80);
    expect(frame.weight).toBeUndefined();
  });

  it('VisemeFrame accepts optional weight', () => {
    const frame: VisemeFrame = { viseme: 'PP', startMs: 0, endMs: 80, weight: 0.8 };
    expect(frame.weight).toBe(0.8);
  });

  it('ConversationTurn has role, text, status', () => {
    const turn: ConversationTurn = { role: 'user', text: 'hello', status: 'final' };
    expect(turn.role).toBe('user');
    expect(turn.status).toBe('final');
  });

  it('AvatarMessage discriminates on type field', () => {
    const msg: AvatarMessage = { type: 'partial', text: 'hello' };
    if (msg.type === 'partial') {
      expect(msg.text).toBe('hello');
    }
  });
});
