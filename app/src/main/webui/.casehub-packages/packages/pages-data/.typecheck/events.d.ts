export interface PagesEventDetail<T = unknown> {
    readonly topic: string;
    readonly payload: T;
}
export declare function emitPagesEvent<T>(target: EventTarget, topic: string, payload: T): void;
export declare function onPagesEvent<T>(target: EventTarget, topicOrPattern: string, handler: (payload: T) => void): () => void;
//# sourceMappingURL=events.d.ts.map