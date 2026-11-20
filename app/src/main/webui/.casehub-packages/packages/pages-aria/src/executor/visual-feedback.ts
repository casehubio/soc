const STYLE_ID = 'scenario-feedback-styles';
const CLICK_HIGHLIGHT_DURATION = 800;
const DEFAULT_TYPE_SPEED = 40;

let skipTyping = false;

const CSS = `
.scenario-highlight {
  outline: 2px solid rgba(56, 189, 248, 0.8) !important;
  outline-offset: 2px;
  animation: scenario-pulse 0.8s ease-out;
}
.scenario-highlight-click {
  outline: 3px solid rgba(250, 204, 21, 0.9) !important;
  outline-offset: 2px;
  animation: scenario-click-flash 0.8s ease-out;
}
@keyframes scenario-pulse {
  0% { box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.4); }
  100% { box-shadow: 0 0 0 8px rgba(56, 189, 248, 0); }
}
@keyframes scenario-click-flash {
  0% { box-shadow: 0 0 0 0 rgba(250, 204, 21, 0.6); transform: scale(0.98); }
  30% { box-shadow: 0 0 12px 4px rgba(250, 204, 21, 0.4); transform: scale(1); }
  100% { box-shadow: 0 0 0 8px rgba(250, 204, 21, 0); }
}
.scenario-typing {
  outline: 2px solid rgba(134, 239, 172, 0.8) !important;
  outline-offset: 2px;
  box-shadow: 0 0 8px rgba(134, 239, 172, 0.3);
}
`;

export function injectStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = CSS;
  document.head.appendChild(style);
}

export function highlightElement(el: Element, type: 'click' | 'fill' | 'select'): void {
  const cls = type === 'click' ? 'scenario-highlight-click' : 'scenario-highlight';
  el.classList.add(cls);
  setTimeout(() => {
    el.classList.remove(cls);
  }, CLICK_HIGHLIGHT_DURATION);
}

export function completeTypingNow(): void {
  skipTyping = true;
}

export function isTypingSkipped(): boolean {
  return skipTyping;
}

export function resetTypingSkip(): void {
  skipTyping = false;
}

export async function typeText(
  el: HTMLInputElement | HTMLTextAreaElement,
  value: string,
  speed = DEFAULT_TYPE_SPEED,
): Promise<void> {
  el.focus();
  el.classList.add('scenario-typing');
  skipTyping = false;

  for (let i = 1; i <= value.length; i++) {
    if (skipTyping) {
      el.value = value;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      break;
    }
    await new Promise<void>(r => setTimeout(r, speed));
    el.value = value.slice(0, i);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  skipTyping = false;
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.classList.remove('scenario-typing');
}
