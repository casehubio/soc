import type { RuntimeContext, EscapeMode } from "./types.js";

/**
 * Resolve a dot-separated path against the context object.
 * For filter values (arrays), returns the first element.
 * Empty arrays, missing paths, and null values return empty string.
 */
function resolvePath(path: string, context: RuntimeContext): string {
  const parts = path.split(".");
  let current: unknown = context;

  for (const part of parts) {
    if (current == null || typeof current !== "object") {
      return "";
    }
    current = (current as Record<string, unknown>)[part];
  }

  // Handle filter arrays: use first element, empty array → ""
  if (Array.isArray(current)) {
    return current.length > 0 ? String(current[0]) : "";
  }

  // Handle null/undefined
  if (current == null) {
    return "";
  }

  // Convert to string
  return String(current);
}

/**
 * Apply escaping based on the specified mode.
 */
function applyEscape(value: string, mode: EscapeMode): string {
  switch (mode) {
    case "html":
      return escapeHtml(value);
    case "markdown":
      return escapeHtml(escapeMarkdown(value));
    case "url":
      return encodeURIComponent(value);
    case "none":
      return value;
  }
}

/**
 * Escape HTML entities: <>"&'
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Escape markdown special characters with backslash prefix.
 * Characters: *_`[#~
 */
function escapeMarkdown(str: string): string {
  return str.replace(/([*_`[\]#~])/g, "\\$1");
}

/**
 * Resolve template variables in a string.
 * Syntax: #{path.to.value}
 * Applies escaping based on the specified mode.
 */
export function resolveTemplate(
  template: string,
  context: RuntimeContext,
  escape: EscapeMode
): string {
  return template.replace(/#\{([^}]+)\}/g, (_match, path: string) => {
    const rawValue = resolvePath(path.trim(), context);
    return applyEscape(rawValue, escape);
  });
}

/**
 * Check if a string contains template variables.
 */
export function hasTemplateVars(str: string): boolean {
  return /#\{/.test(str);
}

/**
 * Check if all template variables in a string resolve to non-empty values.
 * Returns true for strings with no template variables.
 */
export function allTemplateVarsResolved(
  template: string,
  context: RuntimeContext
): boolean {
  const matches = template.matchAll(/#\{([^}]+)\}/g);
  for (const match of matches) {
    const pathCapture = match[1];
    if (!pathCapture) {
      continue;
    }
    const path = pathCapture.trim();
    const resolved = resolvePath(path, context);
    if (resolved === "") {
      return false;
    }
  }
  return true;
}
