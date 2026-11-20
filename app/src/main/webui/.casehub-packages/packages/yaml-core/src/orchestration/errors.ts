export class ChannelClosedError extends Error {
  constructor(public readonly channelName: string, cause?: Error) {
    super(`Channel '${channelName}' is closed`);
    this.name = 'ChannelClosedError';
    if (cause) this.cause = cause;
  }
}

export class IllegalTransitionError extends Error {
  constructor(
    public readonly machineName: string,
    public readonly from: string,
    public readonly to: string,
  ) {
    super(`Illegal transition in '${machineName}': ${from} → ${to}`);
    this.name = 'IllegalTransitionError';
  }
}

export class SemaphoreReentrancyError extends Error {
  constructor(
    public readonly semaphoreName: string,
    public readonly stepContext: string,
  ) {
    super(`Semaphore '${semaphoreName}' reentrancy detected in '${stepContext}'`);
    this.name = 'SemaphoreReentrancyError';
  }
}
