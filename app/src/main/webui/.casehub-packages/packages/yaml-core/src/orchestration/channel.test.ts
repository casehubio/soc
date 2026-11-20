import { describe, it, expect } from 'vitest';
import { DefaultOrcChannel } from './channel.js';
import { ChannelClosedError } from './errors.js';

describe('DefaultOrcChannel', () => {
  describe('unbounded', () => {
    it('send then receive', async () => {
      const ch = new DefaultOrcChannel<number>();
      await ch.send(42);
      expect(await ch.receive()).toBe(42);
    });

    it('receive blocks until send', async () => {
      const ch = new DefaultOrcChannel<string>();
      let received: string | undefined;
      const p = ch.receive().then((v) => { received = v; });
      expect(received).toBeUndefined();
      await ch.send('hello');
      await p;
      expect(received).toBe('hello');
    });

    it('FIFO ordering', async () => {
      const ch = new DefaultOrcChannel<number>();
      await ch.send(1);
      await ch.send(2);
      await ch.send(3);
      expect(await ch.receive()).toBe(1);
      expect(await ch.receive()).toBe(2);
      expect(await ch.receive()).toBe(3);
    });

    it('isEmpty reflects buffer state', async () => {
      const ch = new DefaultOrcChannel<number>();
      expect(ch.isEmpty()).toBe(true);
      await ch.send(1);
      expect(ch.isEmpty()).toBe(false);
      await ch.receive();
      expect(ch.isEmpty()).toBe(true);
    });
  });

  describe('bounded', () => {
    it('send blocks when buffer full', async () => {
      const ch = new DefaultOrcChannel<number>(1);
      await ch.send(1);
      let sent = false;
      const p = ch.send(2).then(() => { sent = true; });
      expect(sent).toBe(false);
      await ch.receive();
      await p;
      expect(sent).toBe(true);
    });

    it('send with timeout returns false when full', async () => {
      const ch = new DefaultOrcChannel<number>(1);
      await ch.send(1);
      expect(await ch.send(2, 10)).toBe(false);
    });
  });

  describe('close', () => {
    it('close rejects pending receivers', async () => {
      const ch = new DefaultOrcChannel<number>();
      const p = ch.receive();
      ch.close();
      await expect(p).rejects.toThrow(ChannelClosedError);
    });

    it('receive after close throws', async () => {
      const ch = new DefaultOrcChannel<number>();
      ch.close();
      await expect(ch.receive()).rejects.toThrow(ChannelClosedError);
    });

    it('error close stores cause', () => {
      const ch = new DefaultOrcChannel<number>();
      const cause = new Error('upstream');
      ch.close(cause);
      expect(ch.isErrorClosed()).toBe(true);
      expect(ch.closeError()).toBe(cause);
    });

    it('receive with timeout returns undefined on timeout', async () => {
      const ch = new DefaultOrcChannel<number>();
      expect(await ch.receive(10)).toBeUndefined();
    });
  });

  describe('AbortSignal', () => {
    it('receive rejects with AbortError when signal aborts while waiting', async () => {
      const ch = new DefaultOrcChannel<number>();
      const controller = new AbortController();
      const p = ch.receive(controller.signal);
      controller.abort();
      await expect(p).rejects.toThrow('aborted');
    });

    it('receive rejects immediately if signal already aborted', async () => {
      const ch = new DefaultOrcChannel<number>();
      const controller = new AbortController();
      controller.abort();
      await expect(ch.receive(controller.signal)).rejects.toThrow('aborted');
    });

    it('receive resolves normally when data arrives before abort', async () => {
      const ch = new DefaultOrcChannel<number>();
      const controller = new AbortController();
      await ch.send(42);
      expect(await ch.receive(controller.signal)).toBe(42);
    });

    it('receive removes waiter from queue on abort', async () => {
      const ch = new DefaultOrcChannel<number>();
      const controller = new AbortController();
      const p = ch.receive(controller.signal).catch(() => {});
      controller.abort();
      await p;
      await ch.send(99);
      expect(await ch.receive()).toBe(99);
    });
  });
});
