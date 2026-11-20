const TRUTHY = new Set(['true', 'yes', 'on', 'y', '1']);
const FALSY = new Set(['false', 'no', 'off', 'n', '0']);

export function isTruthy(value: string): boolean {
  const lower = value.toLowerCase();
  if (TRUTHY.has(lower)) return true;
  if (FALSY.has(lower)) return false;
  throw new Error(
    `Condition resolved to '${value}' which is not a boolean value. ` +
    `Expected: true/false/yes/no/on/off/y/n/1/0`,
  );
}
