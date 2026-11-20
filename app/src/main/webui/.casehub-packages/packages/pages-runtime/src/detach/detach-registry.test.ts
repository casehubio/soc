import { describe, it, expect } from "vitest";
import { DetachRegistry } from "./detach-registry.js";
import type { DetachController } from "./detach-controller.js";

function mockController(id: string): DetachController {
  return {
    componentId: id,
    isDetached: false,
    childWindow: null,
    detach() {},
    reattach() {},
    dispose() {},
  } as unknown as DetachController;
}

describe("DetachRegistry", () => {
  it("registers and retrieves controllers", () => {
    const reg = new DetachRegistry();
    const ctrl = mockController("a");
    reg.register("a", ctrl);
    expect(reg.has("a")).toBe(true);
    expect(reg.get("a")).toBe(ctrl);
  });

  it("removes controllers", () => {
    const reg = new DetachRegistry();
    reg.register("a", mockController("a"));
    reg.remove("a");
    expect(reg.has("a")).toBe(false);
  });

  it("reattachAll calls reattach on every controller and clears", () => {
    const reg = new DetachRegistry();
    const calls: string[] = [];
    const a = mockController("a");
    const b = mockController("b");
    a.reattach = () => calls.push("a");
    b.reattach = () => calls.push("b");
    reg.register("a", a);
    reg.register("b", b);
    reg.reattachAll();
    expect(calls).toEqual(["a", "b"]);
    expect(reg.has("a")).toBe(false);
    expect(reg.has("b")).toBe(false);
  });

  it("disposeAll calls dispose and clears", () => {
    const reg = new DetachRegistry();
    const calls: string[] = [];
    const a = mockController("a");
    a.dispose = () => calls.push("disposed-a");
    reg.register("a", a);
    reg.disposeAll();
    expect(calls).toEqual(["disposed-a"]);
    expect(reg.has("a")).toBe(false);
  });

  it("forEach iterates active controllers", () => {
    const reg = new DetachRegistry();
    reg.register("a", mockController("a"));
    reg.register("b", mockController("b"));
    const ids: string[] = [];
    reg.forEach((ctrl, id) => ids.push(id));
    expect(ids).toEqual(["a", "b"]);
  });
});
