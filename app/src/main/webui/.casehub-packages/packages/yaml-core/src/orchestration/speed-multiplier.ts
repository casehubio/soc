export interface SpeedMultiplier {
  currentSpeed(): number;
  adjustDelay(delayMs: number): number;
}

export class DefaultSpeedMultiplier implements SpeedMultiplier {
  currentSpeed(): number { return 1; }
  adjustDelay(delayMs: number): number { return delayMs; }
}

export class FixedSpeedMultiplier implements SpeedMultiplier {
  constructor(private readonly speed: number) {}
  currentSpeed(): number { return this.speed; }
  adjustDelay(delayMs: number): number {
    return Math.floor(delayMs / this.speed);
  }
}
