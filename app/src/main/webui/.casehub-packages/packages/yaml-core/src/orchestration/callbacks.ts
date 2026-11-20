export type StateHandler = () => void;

export type TransitionHandler = (payload: unknown) => void;

export type Condition = () => boolean;

export type SpeedMultiplier = () => number;

export type RuntimeForEach = () => unknown[];
