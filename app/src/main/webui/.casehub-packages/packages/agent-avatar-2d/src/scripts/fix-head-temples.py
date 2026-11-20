"""
1. Strip hair-level transition fills (previous fix attempts)
2. Add skin-coloured temple fills to HEAD symbols
"""
import re
import sys

svg_path = sys.argv[1]

with open(svg_path) as f:
    content = f.read()

# Step 1: Strip ONLY the transition fills from hair symbols (targeted removal)
def strip_hair_transitions(m):
    full = m.group(0)
    sym_id = m.group(1)
    if not sym_id.startswith('hair:'):
        return full
    full = full.replace('  <!-- Temple transition fills (stepped wedge) -->\n', '')
    full = full.replace('  <!-- Transition fills: cover head/hair gap at top corners -->\n', '')
    full = re.sub(r'  <rect x="6[46]" y="[234]\d" width="[12]\d" height="[48]" fill="var\(--hair-color\)"/>\n', '', full)
    full = re.sub(r'  <rect x="11[46]" y="[234]\d" width="[12]\d" height="[48]" fill="var\(--hair-color\)"/>\n', '', full)
    full = re.sub(r'  <rect x="7[04]" y="4[04]" width="1[04]" height="4" fill="var\(--hair-color\)"/>\n', '', full)
    full = re.sub(r'  <rect x="116" y="4[04]" width="1[04]" height="4" fill="var\(--hair-color\)"/>\n', '', full)
    return full

content = re.sub(r'<symbol id="([^"]+)"[^>]*>[\s\S]*?</symbol>', strip_hair_transitions, content)

# Step 2: For each head, trace the path and add temple fills
HEAD_TEMPLES = {
    'head:oval': [
        (26, 66, 82, 134, 118),
        (28, 66, 78, 138, 122),
        (30, 66, 74, 138, 126),
        (32, 66, 70, 138, 130),
    ],
    'head:square-jaw': [
        (34, 62, 78, 138, 122),
        (36, 62, 74, 138, 126),
        (38, 62, 70, 138, 130),
    ],
    'head:angular': [
        (34, 66, 82, 134, 118),
        (36, 66, 78, 134, 122),
        (38, 66, 74, 134, 126),
        (40, 66, 70, 134, 130),
    ],
    'head:round': [
        (38, 62, 78, 138, 122),
        (40, 62, 74, 138, 126),
        (42, 62, 72, 138, 130),
        (44, 62, 68, 138, 132),
        (46, 62, 66, 138, 134),
    ],
    'head:round-wide': [
        (46, 58, 72, 142, 128),
        (48, 58, 68, 142, 132),
        (50, 58, 64, 142, 136),
        (52, 58, 62, 142, 138),
    ],
    'head:diamond': [
        (32, 64, 80, 136, 120),
        (34, 64, 76, 136, 124),
        (36, 64, 72, 136, 128),
        (38, 64, 70, 136, 130),
    ],
    'head:heart': [
        (34, 62, 78, 138, 122),
        (36, 62, 74, 138, 126),
        (38, 62, 70, 138, 130),
        (40, 62, 68, 138, 132),
    ],
    'head:soft-oval': [
        (28, 64, 78, 136, 122),
        (30, 64, 74, 136, 126),
        (32, 64, 70, 136, 130),
        (34, 64, 68, 136, 132),
    ],
    'head:strong-sym': [
        (34, 62, 74, 138, 126),
        (36, 62, 70, 138, 130),
        (38, 62, 68, 138, 132),
    ],
    'head:weathered': [
        (30, 64, 80, 136, 120),
        (32, 64, 76, 136, 124),
        (34, 64, 72, 136, 128),
    ],
    'head:standard': [
        (34, 62, 78, 138, 122),
        (36, 62, 74, 138, 126),
        (38, 62, 70, 138, 130),
    ],
    'head:fallback': [
        (34, 62, 78, 138, 122),
        (36, 62, 74, 138, 126),
        (38, 62, 70, 138, 130),
    ],
}

count = 0

def add_temple_fills(m):
    global count
    full = m.group(0)
    sym_id = m.group(1)

    if sym_id not in HEAD_TEMPLES:
        return full
    if '<!-- Temple fills' in full:
        return full

    steps = HEAD_TEMPLES[sym_id]
    fills = ['  <!-- Temple fills: skin between outline and ears -->']
    for (y, left_ear, left_head, right_ear, right_head) in steps:
        lw = left_head - left_ear
        rw = right_ear - right_head
        if lw > 0:
            fills.append(f'  <rect x="{left_ear}" y="{y}" width="{lw}" height="2" fill="var(--skin)"/>')
        if rw > 0:
            fills.append(f'  <rect x="{right_head}" y="{y}" width="{rw}" height="2" fill="var(--skin)"/>')

    # Insert after the main path element
    lines = full.split('\n')
    insert_idx = 1
    for i, line in enumerate(lines):
        if '<path' in line and 'var(--skin)' in line:
            insert_idx = i + 1
            break

    result = lines[:insert_idx]
    result.append('\n'.join(fills))
    result.extend(lines[insert_idx:])
    count += 1
    return '\n'.join(result)

content = re.sub(r'<symbol id="([^"]+)"[^>]*>[\s\S]*?</symbol>', add_temple_fills, content)

with open(svg_path, 'w') as f:
    f.write(content)

print(f'Added temple fills to {count} head symbols')
