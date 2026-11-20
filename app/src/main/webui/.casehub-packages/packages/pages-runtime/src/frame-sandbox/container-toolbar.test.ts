import { describe, it, expect, vi } from "vitest";
import { createContainerToolbar } from "./container-toolbar";

describe("organiser-toolbar", () => {
  it("hides entire toolbar for content mode", () => {
    const toolbar = createContainerToolbar(
      ["free", "tabbed", "accordion", "content"],
      "content",
      { onAdd: () => {}, onLayoutChange: () => {} },
    );
    expect(toolbar.element.style.display).toBe("none");
  });

  it("renders no toolbar for content-only policy", () => {
    const toolbar = createContainerToolbar(
      ["content"],
      "content",
      { onAdd: () => {}, onLayoutChange: () => {} },
    );
    expect(toolbar.element.style.display).toBe("none");
  });

  it("shows ⊞ only in free mode", () => {
    const toolbar = createContainerToolbar(
      ["free", "tabbed", "accordion"],
      "free",
      { onAdd: () => {}, onLayoutChange: () => {}, onArrange: () => {} },
    );
    const arrangeBtn = toolbar.element.querySelector(
      "[data-toolbar-arrange]",
    ) as HTMLElement;
    expect(arrangeBtn).not.toBeNull();
    expect(arrangeBtn.style.display).not.toBe("none");

    toolbar.setActive("tabbed");
    expect(arrangeBtn.style.display).toBe("none");

    toolbar.setActive("accordion");
    expect(arrangeBtn.style.display).toBe("none");

    toolbar.setActive("free");
    expect(arrangeBtn.style.display).not.toBe("none");
  });

  it("setActive to content hides the toolbar", () => {
    const toolbar = createContainerToolbar(
      ["free", "tabbed", "accordion", "content"],
      "free",
      { onAdd: () => {}, onLayoutChange: () => {}, onArrange: () => {} },
    );
    expect(toolbar.element.style.display).not.toBe("none");

    toolbar.setActive("content");
    expect(toolbar.element.style.display).toBe("none");
  });

  it("setActive from content to container mode shows toolbar", () => {
    const toolbar = createContainerToolbar(
      ["free", "tabbed", "accordion", "content"],
      "content",
      { onAdd: () => {}, onLayoutChange: () => {}, onArrange: () => {} },
    );
    expect(toolbar.element.style.display).toBe("none");

    toolbar.setActive("tabbed");
    expect(toolbar.element.style.display).not.toBe("none");
  });

  it("☰ cycles through all container modes", () => {
    const onChange = vi.fn();
    const toolbar = createContainerToolbar(
      ["free", "tabbed", "accordion"],
      "free",
      { onAdd: () => {}, onLayoutChange: onChange },
    );
    const modeBtn = toolbar.element.querySelector(
      "[data-toolbar-mode]",
    ) as HTMLElement;
    expect(modeBtn).not.toBeNull();

    modeBtn.click();
    expect(onChange).toHaveBeenLastCalledWith("tabbed");

    modeBtn.click();
    expect(onChange).toHaveBeenLastCalledWith("accordion");

    modeBtn.click();
    expect(onChange).toHaveBeenLastCalledWith("free");
  });

  it("☰ hidden when only one container mode allowed", () => {
    const toolbar = createContainerToolbar(
      ["tabbed"],
      "tabbed",
      { onAdd: () => {}, onLayoutChange: () => {} },
    );
    const modeBtn = toolbar.element.querySelector(
      "[data-toolbar-mode]",
    ) as HTMLElement;
    expect(modeBtn.style.display).toBe("none");
  });

  it("☰ toggles between two modes when only two allowed", () => {
    const onChange = vi.fn();
    const toolbar = createContainerToolbar(
      ["tabbed", "accordion"],
      "tabbed",
      { onAdd: () => {}, onLayoutChange: onChange },
    );
    const modeBtn = toolbar.element.querySelector(
      "[data-toolbar-mode]",
    ) as HTMLElement;

    modeBtn.click();
    expect(onChange).toHaveBeenLastCalledWith("accordion");

    modeBtn.click();
    expect(onChange).toHaveBeenLastCalledWith("tabbed");
  });

  it("arrange dropdown renders at document level to escape overflow clipping", () => {
    const toolbar = createContainerToolbar(
      ["free", "tabbed", "accordion"],
      "free",
      { onAdd: () => {}, onLayoutChange: () => {}, onArrange: () => {} },
    );
    const arrangeBtn = toolbar.element.querySelector(
      "[data-toolbar-arrange]",
    ) as HTMLElement;
    expect(arrangeBtn).not.toBeNull();

    const inlineDropdown = arrangeBtn.querySelector(".arrange-dropdown");
    expect(inlineDropdown).toBeNull();

    arrangeBtn.click();
    const portalDropdown = document.body.querySelector(".arrange-dropdown");
    expect(portalDropdown).not.toBeNull();
    expect(portalDropdown!.parentElement).toBe(document.body);
  });

  it("toolbar is positioned at top-right, not bottom-right", () => {
    const toolbar = createContainerToolbar(
      ["free", "tabbed"],
      "tabbed",
      { onAdd: () => {}, onLayoutChange: () => {} },
    );
    expect(toolbar.element.style.top).toBe("4px");
    expect(toolbar.element.style.bottom).toBe("");
  });
});
