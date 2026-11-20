"""
Add small stepped transition fills to each hair symbol.
Three rects per side, tapering inward (18→14→10px wide, each 4px tall).
Covers the gap between hair cap bottom and head top corners.
Placed first in the symbol so highlights/shadows render on top.

Replaces any existing transition fills (width="22" height="32" giant rects).
"""
import re
import sys

svg_path = sys.argv[1]

with open(svg_path) as f:
    content = f.read()

TRANSITION = """  <!-- Temple transition fills (stepped wedge) -->
  <rect x="66" y="36" width="18" height="4" fill="var(--hair-color)"/>
  <rect x="70" y="40" width="14" height="4" fill="var(--hair-color)"/>
  <rect x="74" y="44" width="10" height="4" fill="var(--hair-color)"/>
  <rect x="116" y="36" width="18" height="4" fill="var(--hair-color)"/>
  <rect x="116" y="40" width="14" height="4" fill="var(--hair-color)"/>
  <rect x="116" y="44" width="10" height="4" fill="var(--hair-color)"/>"""

count = 0

def process_hair(m):
    global count
    full = m.group(0)
    sym_id = m.group(1)
    if not sym_id.startswith('hair:'):
        return full

    # Remove old giant transition fills if present
    full = re.sub(r'\s*<!-- Transition fills:.*?-->\n', '', full)
    full = re.sub(r'\s*<rect x="64" y="26" width="22" height="32" fill="var\(--hair-color\)"/>\n', '', full)
    full = re.sub(r'\s*<rect x="114" y="26" width="22" height="32" fill="var\(--hair-color\)"/>\n', '', full)

    # Skip if stepped fills already present
    if 'Temple transition fills' in full:
        return full

    # Insert after opening <symbol> tag
    lines = full.split('\n')
    result = [lines[0]]
    result.append(TRANSITION)
    result.extend(lines[1:])
    count += 1
    return '\n'.join(result)

content = re.sub(r'<symbol id="([^"]+)"[^>]*>[\s\S]*?</symbol>', process_hair, content)

with open(svg_path, 'w') as f:
    f.write(content)

print(f'Added stepped transition fills to {count} hair symbols')
