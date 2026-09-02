export function onPagesEvent<T = unknown>(
  target: EventTarget,
  topic: string,
  handler: (detail: T) => void,
): void {
  target.addEventListener(topic, ((e: CustomEvent<T>) => handler(e.detail)) as EventListener);
}

export function emitPagesEvent<T = unknown>(
  target: EventTarget,
  topic: string,
  detail: T,
): void {
  target.dispatchEvent(new CustomEvent(topic, { detail, bubbles: true }));
}
