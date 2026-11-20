"""
Strip eyes, nose, mouth sections from head symbols.
Handles both comment formats: '<!-- Eyes: ...' and '<!-- Eyes ...'
Only strips within <symbol id="head:..."> blocks.
"""
import re
import sys

svg_path = sys.argv[1]

with open(svg_path) as f:
    content = f.read()

FACE_MARKERS = ['Eyes', 'Nose', 'Mouth', 'Upper lip']
KEEP_MARKERS = ['Cheek', 'Chin', 'Neck', 'Shadow below', 'Ear', 'AA', 'Skin',
                'Outline', 'Forehead', 'Jaw', 'Temple', 'Anti-alias', 'no neck']

def is_face_comment(line):
    stripped = line.strip()
    if not stripped.startswith('<!--'):
        return False
    for marker in FACE_MARKERS:
        if marker in stripped:
            return True
    return False

def is_keep_comment(line):
    stripped = line.strip()
    if not stripped.startswith('<!--'):
        return False
    for marker in KEEP_MARKERS:
        if marker in stripped:
            return True
    return False

def strip_faces(symbol_text):
    lines = symbol_text.split('\n')
    result = []
    skipping = False
    for line in lines:
        stripped = line.strip()
        if is_face_comment(line):
            skipping = True
            continue
        if skipping:
            if stripped.startswith('<!--') or stripped == '</symbol>':
                skipping = False
                if stripped == '</symbol>':
                    result.append(line)
                    continue
                if is_face_comment(line):
                    skipping = True
                    continue
                result.append(line)
                continue
            continue
        result.append(line)
    return '\n'.join(result)

def process(content):
    def replace_head(m):
        full = m.group(0)
        sym_id = m.group(1)
        if not sym_id.startswith('head:'):
            return full
        return strip_faces(full)
    return re.sub(r'<symbol id="([^"]+)"[^>]*>[\s\S]*?</symbol>', replace_head, content)

content = process(content)

remaining = 0
in_head = False
for line in content.split('\n'):
    if '<symbol id="head:' in line:
        in_head = True
    if in_head and '</symbol>' in line:
        in_head = False
    if in_head:
        for m in FACE_MARKERS:
            if m in line and '<!--' in line:
                remaining += 1

with open(svg_path, 'w') as f:
    f.write(content)

print(f'Stripped face features from heads. Remaining face comments in heads: {remaining}')
