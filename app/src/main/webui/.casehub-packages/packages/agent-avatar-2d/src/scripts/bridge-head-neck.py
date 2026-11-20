"""
Bridge head-to-neck gaps in head symbols.
After face stripping, some heads have a gap between the face outline
bottom and the neck rects. This script extends neck rects upward to
close the gap, using a skin-colored rect.
"""
import re
import sys

svg_path = sys.argv[1]

with open(svg_path) as f:
    content = f.read()

def trace_path_max_y(path_d):
    """Trace SVG path to find maximum y coordinate reached."""
    m = re.match(r'M\s*(-?\d+),(-?\d+)(.*)', path_d)
    if not m:
        return 0
    current_y = int(m.group(2))
    max_y = current_y
    rest = m.group(3)
    for vm in re.finditer(r'v(-?\d+)', rest):
        current_y += int(vm.group(1))
        max_y = max(max_y, current_y)
    return max_y

def find_neck_min_y(text):
    """Find the minimum y of neck rects."""
    neck_idx = text.find('Neck')
    if neck_idx < 0:
        neck_idx = text.find('neck')
    if neck_idx < 0:
        return None
    neck_section = text[neck_idx:neck_idx + 500]
    min_y = None
    for ym in re.finditer(r'y="(\d+)"', neck_section):
        y = int(ym.group(1))
        if min_y is None or y < min_y:
            min_y = y
    return min_y

def find_neck_width(text):
    """Find the width span of the main neck rect."""
    neck_idx = text.find('Neck')
    if neck_idx < 0:
        return 90, 20  # default
    neck_section = text[neck_idx:neck_idx + 300]
    m = re.search(r'x="(\d+)"\s+y="\d+"\s+width="(\d+)"', neck_section)
    if m:
        return int(m.group(1)), int(m.group(2))
    return 90, 20

def bridge_neck(symbol_text):
    """Add a skin-colored bridge rect if there's a gap between head and neck."""
    path_m = re.search(r'd="(M[^"]+)"', symbol_text)
    if not path_m:
        return symbol_text

    path_bottom = trace_path_max_y(path_m.group(1))
    neck_min_y = find_neck_min_y(symbol_text)
    if neck_min_y is None:
        return symbol_text

    gap = neck_min_y - path_bottom
    if gap <= 0:
        return symbol_text

    neck_x, neck_w = find_neck_width(symbol_text)
    bridge = f'  <rect x="{neck_x}" y="{path_bottom}" width="{neck_w}" height="{gap}" fill="var(--skin)"/>'
    neck_comment_idx = symbol_text.find('<!-- Neck')
    if neck_comment_idx < 0:
        neck_comment_idx = symbol_text.find('<!-- neck')
    if neck_comment_idx < 0:
        return symbol_text

    return symbol_text[:neck_comment_idx] + bridge + '\n  ' + symbol_text[neck_comment_idx:]

def soften_aa_corners(symbol_text):
    """Make skin-coloured AA corner pixels semi-transparent."""
    return re.sub(
        r'(<rect x="\d+" y="\d+" width="2" height="2" fill="var\(--skin\)")/>',
        r'\1 opacity="0.5"/>',
        symbol_text
    )

def process(content):
    def replace_head(m):
        full = m.group(0)
        sym_id = m.group(1)
        if not sym_id.startswith('head:'):
            return full
        result = bridge_neck(full)
        if result != full:
            head_name = sym_id.split(':')[1]
            print(f'  Bridged gap in {sym_id}')
        result = soften_aa_corners(result)
        return result
    return re.sub(r'<symbol id="([^"]+)"[^>]*>[\s\S]*?</symbol>', replace_head, content)

content = process(content)

with open(svg_path, 'w') as f:
    f.write(content)

print('Done.')
