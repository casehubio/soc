import type { AriaState } from '@casehubio/pages-primitives';

function parseBool(value: string | null): boolean | undefined {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

export function getAriaState(element: Element): AriaState {
  const busy = parseBool(element.getAttribute('aria-busy'));
  const disabled = parseBool(element.getAttribute('aria-disabled'));
  const expanded = parseBool(element.getAttribute('aria-expanded'));
  const selected = parseBool(element.getAttribute('aria-selected'));
  const checked = element.getAttribute('aria-checked') === 'mixed'
    ? 'mixed'
    : parseBool(element.getAttribute('aria-checked'));
  const hidden = parseBool(element.getAttribute('aria-hidden'));
  return {
    ...(busy !== undefined ? { busy } : {}),
    ...(disabled !== undefined ? { disabled } : {}),
    ...(expanded !== undefined ? { expanded } : {}),
    ...(selected !== undefined ? { selected } : {}),
    ...(checked !== undefined ? { checked } : {}),
    ...(hidden !== undefined ? { hidden } : {}),
  };
}
