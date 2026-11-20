export interface VirtualClock {
  now(): number;
  advance(deltaMs: number): void;
  speed(): number;
  setSpeed(multiplier: number): void;
  pause(): void;
  resume(): void;
  isPaused(): boolean;
}

export class DefaultVirtualClock implements VirtualClock {
  private _time = 0;
  private _speed = 1;
  private _paused = false;

  now(): number { return this._time; }

  advance(deltaMs: number): void {
    this._time += deltaMs;
  }

  speed(): number { return this._speed; }

  setSpeed(multiplier: number): void {
    if (multiplier <= 0 || Number.isNaN(multiplier)) {
      throw new Error(`Speed must be > 0 or Infinity, got ${multiplier}. Use pause() for speed=0.`);
    }
    this._speed = multiplier;
  }

  pause(): void { this._paused = true; }
  resume(): void { this._paused = false; }
  isPaused(): boolean { return this._paused; }
}
