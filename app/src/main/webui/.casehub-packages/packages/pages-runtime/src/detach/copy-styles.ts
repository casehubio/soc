export function copyStyles(sourceDoc: Document, targetDoc: Document): void {
  for (const el of targetDoc.head.querySelectorAll("style, link[rel='stylesheet']")) {
    el.remove();
  }
  for (const el of sourceDoc.head.querySelectorAll("style")) {
    targetDoc.head.appendChild(targetDoc.importNode(el, true));
  }
  for (const el of sourceDoc.head.querySelectorAll("link[rel='stylesheet']")) {
    targetDoc.head.appendChild(targetDoc.importNode(el, true));
  }
}
