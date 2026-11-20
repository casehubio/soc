"""
Fix head path closures: add proper pixel stepping where the z close creates a diagonal.
"""
import re
import sys

svg_path = sys.argv[1]

with open(svg_path) as f:
    content = f.read()

def trace_d(d):
    x, y, sx, sy = 0, 0, 0, 0
    first = True
    for seg in re.finditer(r'([Mhvz])\s*([-\d,\s]*)', d, re.IGNORECASE):
        cmd = seg.group(1)
        val = seg.group(2).strip()
        if cmd == 'M' and val:
            parts = val.split(',')
            x, y = int(parts[0].strip()), int(parts[1].strip())
            if first:
                sx, sy = x, y
                first = False
        elif cmd == 'h' and val:
            x += int(val)
        elif cmd == 'v' and val:
            y += int(val)
    return x, y, sx, sy

def fix_path_d(d):
    lx, ly, sx, sy = trace_d(d)
    dx = sx - lx
    dy = sy - ly
    if abs(dx) <= 2 and abs(dy) <= 2:
        return d, False

    steps = ''
    cx, cy = lx, ly
    while cy != sy:
        step = min(2, abs(sy - cy))
        v = -step if sy < cy else step
        steps += f' v{v}'
        cy += v
        if cx != sx:
            remaining_h = abs(sx - cx)
            remaining_v = abs(sy - cy)
            h_amount = min(4, remaining_h) if remaining_v > 0 and remaining_h > 2 else min(2, remaining_h)
            if h_amount > 0:
                h = h_amount if sx > cx else -h_amount
                steps += f' h{h}'
                cx += h

    while cx != sx:
        h = min(2, abs(sx - cx))
        h = h if sx > cx else -h
        steps += f' h{h}'
        cx += h

    new_d = d.rstrip()
    if new_d.endswith('z'):
        new_d = new_d[:-1].rstrip() + steps + ' z'
    return new_d, True

fixed = []

def fix_head(m):
    full = m.group(0)
    sym_id = m.group(1)
    if not sym_id.startswith('head:'):
        return full

    path_m = re.search(r'd="([^"]+)"', full)
    if not path_m:
        return full

    d = path_m.group(1)
    new_d, was_fixed = fix_path_d(d)
    if was_fixed:
        lx, ly, sx, sy = trace_d(new_d)
        if (lx, ly) == (sx, sy):
            fixed.append(sym_id)
            return full.replace(f'd="{d}"', f'd="{new_d}"')
        else:
            print(f'  WARNING: {sym_id} still has gap after fix: ({lx},{ly}) -> ({sx},{sy})')

    return full

content = re.sub(r'<symbol id="([^"]+)"[^>]*>[\s\S]*?</symbol>', fix_head, content)

with open(svg_path, 'w') as f:
    f.write(content)

print(f'Fixed {len(fixed)} head paths: {", ".join(fixed)}')

# Verify
with open(svg_path) as f:
    content = f.read()

remaining = []
for m in re.finditer(r'<symbol id="(head:[^"]+)"[^>]*>([\s\S]*?)</symbol>', content):
    sym_id = m.group(1)
    path_m = re.search(r'd="([^"]+)"', m.group(2))
    if path_m:
        lx, ly, sx, sy = trace_d(path_m.group(1))
        dx, dy = sx - lx, sy - ly
        if abs(dx) > 2 or abs(dy) > 2:
            remaining.append(f'{sym_id}: ({lx},{ly}) -> ({sx},{sy})')

if remaining:
    print('Remaining gaps:')
    for r in remaining:
        print(f'  {r}')
else:
    print('All head paths close cleanly')
