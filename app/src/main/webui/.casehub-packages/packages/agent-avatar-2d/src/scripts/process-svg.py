"""
Process scummbar-hd-test.svg into mythic.parts.svg:
1. Remap symbol IDs from hd:category-name to category:name
2. Strip eyes/nose/mouth from head symbols
"""
import re
import sys

src = sys.argv[1]
dst = sys.argv[2]

with open(src) as f:
    content = f.read()

def remap_id(m):
    old_id = m.group(1)
    if old_id.startswith('hd:'):
        parts = old_id[3:].split('-', 1)
        if len(parts) == 2:
            new_id = parts[0] + ':' + parts[1]
        else:
            new_id = old_id[3:]
    else:
        new_id = old_id
    return f'<symbol id="{new_id}"'

content = re.sub(r'<symbol id="([^"]+)"', remap_id, content)

def strip_face_features(symbol_content):
    lines = symbol_content.split('\n')
    result = []
    skipping = False
    for line in lines:
        stripped = line.strip()
        if stripped.startswith('<!-- Eyes:') or stripped.startswith('<!-- Nose:') or stripped.startswith('<!-- Mouth:'):
            skipping = True
            continue
        if skipping:
            if stripped.startswith('<!--') or stripped == '</symbol>':
                skipping = False
                if stripped == '</symbol>':
                    result.append(line)
                    continue
                result.append(line)
                continue
            continue
        result.append(line)
    return '\n'.join(result)

def process_heads(content):
    def replace_head(m):
        full = m.group(0)
        sym_id = m.group(1)
        if sym_id.startswith('head:'):
            return strip_face_features(full)
        return full
    return re.sub(r'<symbol id="([^"]+)"[^>]*>[\s\S]*?</symbol>', replace_head, content)

content = process_heads(content)

with open(dst, 'w') as f:
    f.write(content)

count = content.count('<symbol ')
print(f'Processed {count} symbols to {dst}')
