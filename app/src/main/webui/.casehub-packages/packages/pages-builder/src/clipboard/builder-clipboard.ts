export class BuilderClipboard {
  fragment: string | null = null;
  fragmentType: string | null = null;
  operation: 'cut' | 'copy' | null = null;
  insertMode = false;

  private _listeners: (() => void)[] = [];

  set(fragment: string, fragmentType: string, operation: 'cut' | 'copy'): void {
    this.fragment = fragment;
    this.fragmentType = fragmentType;
    this.operation = operation;
    this.insertMode = true;
    this._notify();
  }

  clear(): void {
    this.fragment = null;
    this.fragmentType = null;
    this.operation = null;
    this.insertMode = false;
    this._notify();
  }

  setInsertMode(active: boolean): void {
    this.insertMode = active;
    this._notify();
  }

  subscribe(cb: () => void): () => void {
    this._listeners.push(cb);
    return () => {
      const idx = this._listeners.indexOf(cb);
      if (idx >= 0) this._listeners.splice(idx, 1);
    };
  }

  private _notify(): void {
    for (const cb of this._listeners) cb();
  }
}

let _instance: BuilderClipboard | undefined;

export function getClipboard(): BuilderClipboard {
  if (!_instance) _instance = new BuilderClipboard();
  return _instance;
}

export function _resetForTest(): void {
  _instance = undefined;
}
