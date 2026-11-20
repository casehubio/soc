import { copyStyles } from "./copy-styles.js";
import { EventRelay } from "./event-relay.js";

export class DetachController {
  readonly componentId: string;
  private container: HTMLElement;
  private placeholder: HTMLElement | null = null;
  private _childWindow: Window | null = null;
  private eventRelay: EventRelay | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private panelTitle: string;
  private _isDetached = false;

  constructor(componentId: string, container: HTMLElement, panelTitle: string) {
    this.componentId = componentId;
    this.container = container;
    this.panelTitle = panelTitle;
  }

  get isDetached(): boolean { return this._isDetached; }
  get childWindow(): Window | null { return this._childWindow; }

  detach(): void {
    if (this._isDetached) {
      this._childWindow?.focus();
      return;
    }

    const parentEl = this.container.parentElement;
    if (!parentEl) return;

    const placeholder = document.createElement("div");
    placeholder.setAttribute("data-detach-placeholder", this.componentId);
    placeholder.style.padding = "16px";
    placeholder.style.textAlign = "center";
    placeholder.style.color = "var(--pages-neutral-9, #999)";
    placeholder.textContent = "Panel detached";
    parentEl.insertBefore(placeholder, this.container);
    this.placeholder = placeholder;

    const win = window.open("", "_blank", "width=800,height=600");
    if (!win) {
      placeholder.remove();
      this.placeholder = null;
      console.warn("Popup blocked — allow popups to detach panels.");
      return;
    }

    this._childWindow = win;
    copyStyles(document, win.document);
    win.document.title = this.panelTitle;

    win.document.body.style.margin = "0";
    win.document.body.style.width = "100%";
    win.document.body.style.height = "100vh";
    win.document.body.style.overflow = "auto";

    this.container.setAttribute("data-detaching", "");
    win.document.body.appendChild(win.document.adoptNode(this.container));
    this.container.removeAttribute("data-detaching");

    this.container.style.width = "100%";
    this.container.style.height = "100%";

    this.eventRelay = new EventRelay(win.document, placeholder);
    this.eventRelay.start();

    win.addEventListener("beforeunload", () => { this.reattach(); });

    this.pollTimer = setInterval(() => {
      if (win.closed && this._isDetached) this.reattach();
    }, 500);

    this._isDetached = true;
    win.focus();
  }

  reattach(): void {
    if (!this._isDetached) return;

    this.eventRelay?.stop();
    this.eventRelay = null;

    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }

    if (this.placeholder?.parentElement) {
      this.container.setAttribute("data-detaching", "");
      this.placeholder.parentElement.insertBefore(
        document.adoptNode(this.container),
        this.placeholder,
      );
      this.container.removeAttribute("data-detaching");
      this.container.style.width = "";
      this.container.style.height = "";
      this.placeholder.remove();
    }
    this.placeholder = null;

    if (this._childWindow && !this._childWindow.closed) {
      this._childWindow.close();
    }
    this._childWindow = null;
    this._isDetached = false;

    this.container.setAttribute("tabindex", "-1");
    this.container.focus();
    this.container.removeAttribute("tabindex");
  }

  dispose(): void {
    if (this._isDetached) {
      this.reattach();
    }
    if (this._childWindow && !this._childWindow.closed) {
      this._childWindow.close();
    }
    this._childWindow = null;
  }
}
