import type { TransformFn } from './types.js';
export declare function registerTransform(name: string, fn: TransformFn): void;
export declare function getTransform(name: string): TransformFn;
export declare function listTransforms(): string[];
//# sourceMappingURL=registry.d.ts.map