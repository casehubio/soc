import type { DetachController } from "./detach-controller.js";

export class DetachRegistry {
  private readonly controllers = new Map<string, DetachController>();

  has(id: string): boolean { return this.controllers.has(id); }

  get(id: string): DetachController | undefined { return this.controllers.get(id); }

  register(id: string, controller: DetachController): void {
    this.controllers.set(id, controller);
  }

  remove(id: string): void { this.controllers.delete(id); }

  reattachAll(): void {
    for (const [id, ctrl] of this.controllers) {
      ctrl.reattach();
      this.controllers.delete(id);
    }
  }

  disposeAll(): void {
    for (const [id, ctrl] of this.controllers) {
      ctrl.dispose();
      this.controllers.delete(id);
    }
  }

  forEach(fn: (controller: DetachController, id: string) => void): void {
    this.controllers.forEach(fn);
  }
}
