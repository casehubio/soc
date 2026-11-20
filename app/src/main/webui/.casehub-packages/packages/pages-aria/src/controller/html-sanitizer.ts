const BLOCKED_ELEMENTS = new Set([
  'script', 'iframe', 'object', 'embed', 'form', 'input', 'link', 'meta',
]);

const ALLOWED_ELEMENTS = new Set([
  'p', 'h1', 'h2', 'h3', 'h4', 'strong', 'em', 'code', 'pre', 'li', 'ul', 'ol', 'div', 'span', 'br',
  'svg', 'g', 'defs', 'use', 'symbol', 'clippath', 'mask', 'pattern',
  'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'path',
  'text', 'tspan',
  'lineargradient', 'radialgradient', 'stop', 'marker',
]);

const ALLOWED_ATTRS = new Set([
  'viewbox', 'xmlns', 'width', 'height', 'x', 'y', 'cx', 'cy',
  'r', 'rx', 'ry', 'x1', 'y1', 'x2', 'y2', 'd', 'points', 'transform',
  'fill', 'stroke', 'stroke-width', 'opacity', 'font-size', 'font-family',
  'text-anchor', 'dominant-baseline', 'stroke-dasharray', 'stroke-linecap',
  'style', 'id', 'class', 'aria-label',
  'offset', 'stop-color', 'stop-opacity', 'gradientunits', 'gradienttransform',
  'markerwidth', 'markerheight', 'refx', 'refy', 'orient',
]);

const DANGEROUS_STYLE = /url\s*\(|expression\s*\(|-moz-binding|javascript:/i;

function sanitizeStyle(value: string): string {
  return DANGEROUS_STYLE.test(value) ? '' : value;
}

function walkAndSanitize(node: Node): void {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType !== 1) continue;
    const el = child as Element;
    const tag = el.tagName.toLowerCase();

    if (BLOCKED_ELEMENTS.has(tag)) {
      node.removeChild(child);
      continue;
    }

    if (!ALLOWED_ELEMENTS.has(tag)) {
      while (el.firstChild) node.insertBefore(el.firstChild, el);
      node.removeChild(el);
      continue;
    }

    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on') || !ALLOWED_ATTRS.has(name)) {
        el.removeAttribute(attr.name);
      } else if (name === 'style') {
        const sanitized = sanitizeStyle(attr.value);
        if (sanitized) el.setAttribute('style', sanitized);
        else el.removeAttribute('style');
      }
    }

    walkAndSanitize(el);
  }
}

export function sanitizeHtml(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<body>${html}</body>`, 'text/html');
  walkAndSanitize(doc.body);
  return doc.body.innerHTML;
}
