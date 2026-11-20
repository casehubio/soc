"""
Bake translate(0,N) transforms from head symbols into their coordinates.
Adjusts rect y and path M y-values, removes the <g transform> wrapper.
"""
import re
import sys

svg_path = sys.argv[1]

with open(svg_path) as f:
    content = f.read()

def adjust_rect_y(line, offset):
    def bump(m):
        old_y = int(m.group(1))
        return f'y="{old_y + offset}"'
    return re.sub(r'y="(\d+)"', bump, line, count=1)

def adjust_path_d(line, offset):
    def bump_m(m):
        prefix = m.group(1)
        x = m.group(2)
        y = int(m.group(3))
        rest = m.group(4)
        return f'{prefix}{x},{y + offset}{rest}'
    return re.sub(r'(d="[^"]*?M\s*)(\d+),(\d+)([^"]*")', bump_m, line)

def bake_symbol(symbol_text, offset):
    lines = symbol_text.split('\n')
    result = []
    for line in lines:
        stripped = line.strip()
        if re.match(r'<g\s+transform="translate\(0,\d+\)">', stripped):
            continue
        if stripped == '</g>' and any(re.search(r'translate\(0,\d+\)', l) for l in lines):
            last_close_g = True
            continue
        if '<rect' in stripped and 'y="' in stripped:
            line = adjust_rect_y(line, offset)
        if '<path' in stripped and ' d="' in stripped:
            line = adjust_path_d(line, offset)
        result.append(line)
    return '\n'.join(result)

def process_heads(content):
    def replace_head(m):
        full = m.group(0)
        sym_id = m.group(1)
        if not sym_id.startswith('head:'):
            return full
        tm = re.search(r'translate\(0,(\d+)\)', full)
        if not tm:
            return full
        offset = int(tm.group(1))
        return bake_symbol(full, offset)
    return re.sub(r'<symbol id="([^"]+)"[^>]*>[\s\S]*?</symbol>', replace_head, content)

content = process_heads(content)

with open(svg_path, 'w') as f:
    f.write(content)

print(f'Baked head transforms in {svg_path}')
