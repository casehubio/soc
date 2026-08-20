let currentWorkItemId: string | null = null;
const listeners: Array<(workItemId: string | null, incidentId: string | null) => void> = [];

export function onWorkItemSelected(
  fn: (workItemId: string | null, incidentId: string | null) => void,
): () => void {
  listeners.push(fn);
  return () => {
    const idx = listeners.indexOf(fn);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

export async function selectWorkItem(id: string | null): Promise<void> {
  if (id === currentWorkItemId) return;
  currentWorkItemId = id;

  if (id) {
    history.replaceState(null, "", `#workitem=${id}`);
    try {
      const resp = await fetch(`/workitems/${id}`);
      if (!resp.ok) {
        listeners.forEach((fn) => fn(id, null));
        return;
      }
      const detail = await resp.json();
      const payload = detail?.item?.payload;
      let incidentId: string | null = null;
      if (typeof payload === "string" && payload.length > 0) {
        try {
          incidentId = JSON.parse(payload)?.incidentId ?? null;
        } catch {
          /* non-JSON payload */
        }
      }
      listeners.forEach((fn) => fn(id, incidentId));
    } catch {
      listeners.forEach((fn) => fn(id, null));
    }
  } else {
    history.replaceState(null, "", location.pathname);
    listeners.forEach((fn) => fn(null, null));
  }
}

export function initWorkbenchFromUrl(): void {
  const hash = location.hash;
  const match = hash.match(/workitem=([a-f0-9-]+)/i);
  if (match) selectWorkItem(match[1]);
}

document.addEventListener(
  "pages-event",
  ((e: CustomEvent) => {
    if (e.detail?.topic === "work-item:selected") {
      selectWorkItem(e.detail.payload?.workItemId ?? null);
    }
  }) as EventListener,
);
