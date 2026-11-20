import type { ReactiveController, ReactiveControllerHost } from 'lit';
import type { ConversationTurn, PlaybackItem, VisemeFrame } from './types.js';

export interface AvatarWsHost extends ReactiveControllerHost {
  turns: ConversationTurn[];
  avatarAudioQueue: PlaybackItem[];
  connectionState: 'connecting' | 'connected' | 'disconnected';
}

export class AvatarWsController implements ReactiveController {
  private _host: AvatarWsHost;
  private _wsUrl: string;
  private _reconnectMs: number;
  private _ws: WebSocket | null = null;
  private _shouldReconnect = true;
  private _pendingVisemes: VisemeFrame[] | null = null;
  private _audioCtx: AudioContext | null = null;

  constructor(host: AvatarWsHost, config: { wsUrl: string; reconnectMs?: number }) {
    this._host = host;
    this._wsUrl = config.wsUrl;
    this._reconnectMs = config.reconnectMs ?? 2000;
    host.addController(this);
  }

  hostConnected() { console.log('[WS] hostConnected — connecting'); this._connect(); }

  hostDisconnected() {
    this._shouldReconnect = false;
    this._ws?.close();
    this._ws = null;
  }

  private _connect() {
    const proto = globalThis.location?.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = globalThis.location?.host ?? 'localhost';
    const url = this._wsUrl.startsWith('ws') ? this._wsUrl : `${proto}//${host}${this._wsUrl}`;
    this._ws = new WebSocket(url);
    this._host.connectionState = 'connecting';
    this._host.requestUpdate();

    this._ws.onopen = () => {
      console.log('[WS] onopen — connected');
      this._host.connectionState = 'connected';
      this._host.requestUpdate();
    };

    this._ws.onmessage = (evt: MessageEvent) => {
      if (typeof evt.data === 'string') {
        const parsed = JSON.parse(evt.data);
        console.log('[WS] recv text:', parsed.type, JSON.stringify(parsed).slice(0, 120));
        this._handleTextMessage(parsed);
      } else {
        console.log('[WS] recv binary:', (evt.data as Blob).size || 'unknown', 'bytes');
        this._handleBinaryMessage(evt.data as Blob);
      }
    };

    this._ws.onclose = (evt: CloseEvent) => {
      console.log('[WS] onclose — code:', evt?.code, 'reason:', evt?.reason, 'wasClean:', evt?.wasClean);
      this._host.connectionState = 'disconnected';
      this._host.requestUpdate();
      if (this._shouldReconnect) {
        setTimeout(() => this._connect(), this._reconnectMs);
      }
    };

    this._ws.onerror = (evt: Event) => {
      console.error('[WS] onerror', evt);
      this._host.connectionState = 'disconnected';
      this._host.requestUpdate();
    };
  }

  private _handleTextMessage(msg: { type: string; [key: string]: unknown }) {
    switch (msg.type) {
      case 'partial': {
        const last = this._host.turns[this._host.turns.length - 1];
        if (last && last.role === 'user' && last.status === 'partial') {
          this._host.turns = [...this._host.turns.slice(0, -1), { role: 'user', text: msg.text as string, status: 'partial' }];
        } else {
          this._host.turns = [...this._host.turns, { role: 'user', text: msg.text as string, status: 'partial' }];
        }
        this._host.requestUpdate();
        break;
      }
      case 'transcript': {
        const last = this._host.turns[this._host.turns.length - 1];
        if (last && last.role === 'user' && last.status === 'partial') {
          this._host.turns = [...this._host.turns.slice(0, -1), { role: 'user', text: msg.text as string, status: 'final' }];
        } else {
          this._host.turns = [...this._host.turns, { role: 'user', text: msg.text as string, status: 'final' }];
        }
        this._host.requestUpdate();
        break;
      }
      case 'response':
        this._host.turns = [...this._host.turns, { role: 'avatar', text: msg.text as string, status: 'final' }];
        this._host.requestUpdate();
        break;
      case 'phonemes':
        this._pendingVisemes = (msg.data as VisemeFrame[]) ?? null;
        break;
      case 'timing':
        if (this._host instanceof EventTarget) {
          this._host.dispatchEvent(new CustomEvent('avatar:timing', { detail: msg, bubbles: true, composed: true }));
        }
        break;
      case 'error':
        if (this._host instanceof EventTarget) {
          this._host.dispatchEvent(new CustomEvent('avatar:error', { detail: { message: msg.message }, bubbles: true, composed: true }));
        }
        break;
    }
  }

  private async _handleBinaryMessage(data: Blob | ArrayBuffer) {
    // Capture visemes SYNCHRONOUSLY before any yield point (await).
    // Prevents interleaving from overwriting pendingVisemes while
    // we're decoding the audio blob. Matches original (lines 228-235).
    const myVisemes = this._pendingVisemes;
    this._pendingVisemes = null;

    if (!this._audioCtx) this._audioCtx = new AudioContext();
    try {
      const arrayBuf = data instanceof Blob ? await data.arrayBuffer() : data;
      const audioBuf = await this._audioCtx.decodeAudioData(arrayBuf.slice(0));
      const item = this._buildPlaybackItem(audioBuf, myVisemes);
      this._host.avatarAudioQueue = [...this._host.avatarAudioQueue, item];
      this._host.requestUpdate();
    } catch (e) {
      console.error('[AvatarWsController] audio decode error:', e);
    }
  }

  private _buildPlaybackItem(audio: AudioBuffer, frames: VisemeFrame[] | null): PlaybackItem {
    return { audio, timeline: frames && frames.length > 0 ? frames : null };
  }

  sendStart(opts: { sampleRate: number; llmModel?: string | undefined; ttsModel?: string | undefined }) {
    const msg = JSON.stringify({ type: 'start', ...opts });
    console.log('[WS] sendStart:', msg);
    this._send(msg);
  }

  sendStop() {
    console.log('[WS] sendStop');
    this._send(JSON.stringify({ type: 'stop' }));
  }

  sendText(text: string, opts?: { llmModel?: string; ttsModel?: string }) {
    const msg = JSON.stringify({ type: 'text', text, ...opts });
    console.log('[WS] sendText:', msg);
    this._send(msg);
  }

  sendAudio(buffer: ArrayBuffer) {
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      this._ws.send(buffer);
    }
  }

  private _audioFramesSent = 0;
  private _send(data: string) {
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      this._ws.send(data);
    } else {
      console.warn('[WS] send failed — readyState:', this._ws?.readyState);
    }
  }
}
