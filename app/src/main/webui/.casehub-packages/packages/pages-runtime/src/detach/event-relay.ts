const RELAYED_EVENTS = [
  "pages-filter", "pages-sort", "pages-data-request", "pages-field-change",
  "pages-page", "pages-text-filter", "pages-record-navigate",
  "pages-record-create", "pages-record-delete", "pages-action-request",
  "pages-refresh-request", "pages-slot-change", "pages-dock-toggle",
  "pages-split-resize", "pages-event",
] as const;

export class EventRelay {
  private readonly sourceDoc: Document;
  private readonly targetEl: HTMLElement;
  private readonly listeners: Array<{ type: string; handler: EventListener }> = [];

  constructor(sourceDoc: Document, targetEl: HTMLElement) {
    this.sourceDoc = sourceDoc;
    this.targetEl = targetEl;
  }

  start(): void {
    for (const type of RELAYED_EVENTS) {
      const handler = ((e: CustomEvent) => {
        this.targetEl.dispatchEvent(new CustomEvent(type, {
          bubbles: true,
          composed: true,
          detail: e.detail,
        }));
      }) as EventListener;
      this.sourceDoc.addEventListener(type, handler);
      this.listeners.push({ type, handler });
    }
  }

  stop(): void {
    for (const { type, handler } of this.listeners) {
      this.sourceDoc.removeEventListener(type, handler);
    }
    this.listeners.length = 0;
  }
}
