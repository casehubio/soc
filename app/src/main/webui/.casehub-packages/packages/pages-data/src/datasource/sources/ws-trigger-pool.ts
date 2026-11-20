export interface WsTriggerEvent {
  readonly op: string;
  readonly topic: string;
  readonly payload: Record<string, unknown>;
}

export type WsTriggerHandler = (event: WsTriggerEvent) => void;

interface PoolEntry {
  ws: WebSocket;
  handlers: Set<WsTriggerHandler>;
  reconnectAttempt: number;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  isReconnect: boolean;
}

const BACKOFF_BASE_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;

export class WsTriggerPool {
  private readonly _pool = new Map<string, PoolEntry>();
  private readonly _WS: typeof WebSocket;

  constructor(wsImpl?: typeof WebSocket) {
    this._WS = wsImpl ?? WebSocket;
  }

  subscribe(url: string, handler: WsTriggerHandler): void {
    let entry = this._pool.get(url);
    if (!entry) {
      entry = this._createEntry(url);
      this._pool.set(url, entry);
    }
    entry.handlers.add(handler);
  }

  unsubscribe(url: string, handler: WsTriggerHandler): void {
    const entry = this._pool.get(url);
    if (!entry) return;
    entry.handlers.delete(handler);
    if (entry.handlers.size === 0) {
      this._closeEntry(url, entry);
    }
  }

  disconnectAll(): void {
    for (const [url, entry] of this._pool) {
      this._closeEntry(url, entry);
    }
  }

  private _createEntry(url: string): PoolEntry {
    const entry: PoolEntry = {
      ws: null!,
      handlers: new Set(),
      reconnectAttempt: 0,
      reconnectTimer: null,
      isReconnect: false,
    };
    this._connectWs(url, entry);
    return entry;
  }

  private _connectWs(url: string, entry: PoolEntry): void {
    const ws = new this._WS(url);
    entry.ws = ws;

    ws.onmessage = (e: MessageEvent) => {
      try {
        const msg = JSON.parse(e.data as string) as WsTriggerEvent;
        for (const handler of entry.handlers) {
          handler(msg);
        }
      } catch {
        // Non-JSON — skip
      }
    };

    ws.onopen = () => {
      if (entry.isReconnect) {
        entry.reconnectAttempt = 0;
        const reconnectEvent: WsTriggerEvent = {
          op: "reconnect",
          topic: "__reconnect__",
          payload: {},
        };
        for (const handler of entry.handlers) {
          handler(reconnectEvent);
        }
      }
    };

    ws.onerror = () => { /* onclose fires after onerror */ };

    ws.onclose = () => {
      if (this._pool.has(url) && entry.handlers.size > 0) {
        this._scheduleReconnect(url, entry);
      }
    };
  }

  private _scheduleReconnect(url: string, entry: PoolEntry): void {
    const delay = Math.min(
      BACKOFF_BASE_MS * Math.pow(2, entry.reconnectAttempt),
      MAX_BACKOFF_MS,
    );
    entry.reconnectAttempt++;
    entry.isReconnect = true;
    entry.reconnectTimer = setTimeout(() => {
      entry.reconnectTimer = null;
      if (!this._pool.has(url)) return;
      this._connectWs(url, entry);
    }, delay);
  }

  private _closeEntry(url: string, entry: PoolEntry): void {
    if (entry.reconnectTimer !== null) {
      clearTimeout(entry.reconnectTimer);
      entry.reconnectTimer = null;
    }
    entry.ws.onclose = null;
    entry.ws.close();
    entry.handlers.clear();
    this._pool.delete(url);
  }
}
