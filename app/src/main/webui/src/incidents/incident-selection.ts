let currentIncidentId: string | null = null;
const listeners: Array<(id: string | null) => void> = [];

export function getSelectedIncidentId(): string | null {
  return currentIncidentId;
}

export function onIncidentSelected(fn: (id: string | null) => void): () => void {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

export function selectIncident(id: string | null): void {
  if (id === currentIncidentId) return;
  currentIncidentId = id;
  if (id) {
    history.replaceState(null, "", `#incident=${id}`);
  } else {
    history.replaceState(null, "", location.pathname);
  }
  listeners.forEach(fn => fn(id));
}

export function initSelectionFromUrl(): void {
  const hash = location.hash;
  const match = hash.match(/incident=([a-f0-9-]+)/i);
  if (match) selectIncident(match[1]);
}

document.addEventListener("pages-event", ((e: CustomEvent) => {
  if (e.detail?.topic === "incident:selected") {
    selectIncident(e.detail.payload?.caseId ?? e.detail.payload?.id ?? null);
  }
}) as EventListener);
