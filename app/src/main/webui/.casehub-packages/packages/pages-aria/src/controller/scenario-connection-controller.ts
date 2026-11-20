import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { createEventConnection, type EventConnection } from '@casehubio/pages-data';

export interface ScenarioState {
  scenario: string | null;
  chapter: string | null;
  section: string | null;
  step: string | null;
  paused: boolean;
  speed: number;
  progress: number;
  content: { type: string; markdown?: string; path?: string; section?: string; ref?: unknown } | null;
  slides: string | null;
  outline?: OutlineNode[];
  error?: { step: string; message: string } | null;
}

export interface OutlineNode {
  label: string;
  target: string | null;
  action?: string;
  children: OutlineNode[];
}

export interface ScenarioConnectionOptions {
  connection?: EventConnection;
  eventTarget?: EventTarget;
  baseUrl?: string;
  onState?: (state: ScenarioState) => void;
}

const IDLE_STATE: ScenarioState = {
  scenario: null, chapter: null, section: null, step: null,
  paused: false, speed: 1.0, progress: 0, content: null, slides: null,
};

export class ScenarioConnectionController implements ReactiveController {
  private _host: ReactiveControllerHost;
  private _opts: ScenarioConnectionOptions;
  private _ownConnection: EventConnection | undefined;
  private _ownEventTarget: EventTarget | undefined;

  state: ScenarioState = { ...IDLE_STATE };
  connectionStatus: 'connected' | 'reconnecting' | 'disconnected' = 'disconnected';

  constructor(host: ReactiveControllerHost, opts: ScenarioConnectionOptions) {
    this._host = host;
    this._opts = opts;
    host.addController(this);
  }

  get restBase(): string {
    return this._opts.baseUrl || globalThis.location?.origin || '';
  }

  private _eventHandler = (e: Event): void => {
    const detail = (e as CustomEvent).detail as { topic?: string; payload?: unknown };
    if (detail?.topic !== 'scenario:state') return;
    this.state = detail.payload as ScenarioState;
    this._opts.onState?.(this.state);
    this._host.requestUpdate();
  };

  hostConnected(): void {
    this._ensureConnection();
    const conn = this._getConnection();
    const target = this._getEventTarget();
    if (target) {
      target.addEventListener('pages-event', this._eventHandler);
    }
    if (conn && target) {
      void conn.listen(['scenario:state']);
      this.connectionStatus = conn.status ?? 'disconnected';
      void this._fetchInitialState();
    } else if (target && !conn) {
      this.connectionStatus = 'connected';
    }
  }

  hostDisconnected(): void {
    const target = this._getEventTarget();
    if (target) target.removeEventListener('pages-event', this._eventHandler);
    const conn = this._getConnection();
    if (conn) void conn.unlisten(['scenario:state']);
    if (this._ownConnection) {
      this._ownConnection.close();
      this._ownConnection = undefined;
      this._ownEventTarget = undefined;
    }
  }

  async sendCommand(path: string, body?: object): Promise<void> {
    const target = this._getEventTarget();
    if (!this._opts.baseUrl && !this._opts.connection && target) {
      const command = path.replace(/^\//, '');
      target.dispatchEvent(new CustomEvent('scenario-command', {
        detail: { command, ...body },
      }));
      return;
    }
    await fetch(`${this.restBase}/scenario${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  }

  private _ensureConnection(): void {
    if (this._opts.connection) return;
    if (this._opts.baseUrl && !this._ownConnection) {
      const wsUrl = this._opts.baseUrl.replace(/^http/, 'ws') + '/push';
      if (!this._opts.eventTarget) {
        this._ownEventTarget = new EventTarget();
      }
      const target = this._opts.eventTarget ?? this._ownEventTarget!;
      this._ownConnection = createEventConnection(wsUrl, {
        config: { eventTarget: target },
        onStatusChange: (status) => {
          this.connectionStatus = status;
          this._host.requestUpdate();
        },
      });
    }
  }

  private _getConnection(): EventConnection | undefined {
    return this._opts.connection ?? this._ownConnection;
  }

  private _getEventTarget(): EventTarget | undefined {
    return this._opts.eventTarget ?? this._ownEventTarget;
  }

  private async _fetchInitialState(): Promise<void> {
    try {
      const resp = await fetch(`${this.restBase}/scenario/state`);
      if (resp.ok) {
        this.state = await resp.json() as ScenarioState;
        this._opts.onState?.(this.state);
        this._host.requestUpdate();
      }
    } catch {
      // Connection not ready — will update via push wire
    }
  }
}
