const subscribers = new Set<() => void>();
let intervalId: ReturnType<typeof setInterval> | null = null;

function tick(): void {
  subscribers.forEach(cb => cb());
}

function start(): void {
  if (intervalId !== null) return;
  intervalId = setInterval(tick, 1000);
}

function stop(): void {
  if (intervalId === null) return;
  clearInterval(intervalId);
  intervalId = null;
}

function handleVisibility(): void {
  if (subscribers.size === 0) return;
  if (document.hidden) {
    stop();
  } else {
    start();
  }
}

document.addEventListener('visibilitychange', handleVisibility);

export function subscribe(callback: () => void): void {
  if (subscribers.has(callback)) return;
  subscribers.add(callback);
  if (subscribers.size === 1 && !document.hidden) start();
}

export function unsubscribe(callback: () => void): void {
  subscribers.delete(callback);
  if (subscribers.size === 0) stop();
}
