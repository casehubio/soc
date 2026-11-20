export function getAccessibleName(element: Element): string {
  const label = element.getAttribute('aria-label');
  if (label) return label;

  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy) {
    const root = element.getRootNode() as Document | ShadowRoot;
    const parts = labelledBy.split(/\s+/).map(id => {
      const ref = root.getElementById(id);
      return ref?.textContent?.trim() ?? '';
    });
    const joined = parts.filter(Boolean).join(' ');
    if (joined) return joined;
  }

  return element.textContent?.trim() ?? '';
}
