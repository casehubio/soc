"""
Widen hair side coverage rects so they extend inward past all head top edges.

Target: left side rects must reach x=84 (past the widest head M x of 82).
        right side rects must reach x=116 (past the narrowest head right of 118).

Strategy: for each hair symbol, find the left/right side rects (x < 80, h >= 10)
and extend their width inward.
"""
import re
import sys

svg_path = sys.argv[1]

with open(svg_path) as f:
    content = f.read()

LEFT_TARGET = 84   # Must reach past head:oval's M x=82
RIGHT_TARGET = 116  # Must reach past head:oval's right edge = 118

changes = []

def process_hair(m):
    full = m.group(0)
    sym_id = m.group(1)
    if not sym_id.startswith('hair:'):
        return full

    result = full
    modified = False

    # Find all rects
    def fix_rect(rm):
        nonlocal modified
        rect_str = rm.group(0)
        x = int(rm.group(1))
        y = int(rm.group(2))
        w = int(rm.group(3))
        h = int(rm.group(4))

        if h < 10:
            return rect_str

        # Left side rect: x < 80
        if x < 80:
            inner = x + w
            if inner < LEFT_TARGET:
                new_w = LEFT_TARGET - x
                changes.append(f'  {sym_id}: left rect x={x} width {w}->{new_w} (inner {inner}->{LEFT_TARGET})')
                modified = True
                return rect_str.replace(f'width="{w}"', f'width="{new_w}"')

        # Right side rect: x > 120
        if x > 120:
            if x > RIGHT_TARGET:
                new_x = RIGHT_TARGET
                new_w = w + (x - RIGHT_TARGET)
                changes.append(f'  {sym_id}: right rect x {x}->{new_x} width {w}->{new_w} (outer {x}->{RIGHT_TARGET})')
                modified = True
                return rect_str.replace(f'x="{x}"', f'x="{new_x}"').replace(f'width="{w}"', f'width="{new_w}"')

        return rect_str

    result = re.sub(
        r'<rect\s+x="(\d+)"\s+y="(\d+)"\s+width="(\d+)"\s+height="(\d+)"',
        fix_rect, full)

    return result

content = re.sub(r'<symbol id="([^"]+)"[^>]*>[\s\S]*?</symbol>', process_hair, content)

with open(svg_path, 'w') as f:
    f.write(content)

print(f'Widened {len(changes)} side rects:')
for c in changes:
    print(c)
