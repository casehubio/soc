"""
Fix the 5 head paths with diagonal z-close gaps by adding proper stepping.
Each fix is computed from the traced gap: (last_x, last_y) -> (start_x, start_y).
"""
import sys

svg_path = sys.argv[1]

with open(svg_path) as f:
    content = f.read()

# head:oval — (84,30) -> (82,26): from h4 z → need v-2 h-2 v-2 before z
# Current ending: h4 v-2 h4 z (at line 11)
# The gap is 4px vertical. Fix: replace final 'h4 z' with 'h2 v-2 h-2 v-2 z'
old = 'M 82,26 h36 v2 h4 v2 h4 v2 h2 v2 h2 v2 h2 v68 h-2 v2 h-2 v2 h-2 v4 h-2 v2 h-4 v2 h-4 v2 h-6 v2 h-16 v-2 h-6 v-2 h-4 v-2 h-4 v-2 h-2 v-4 h-2 v-2 h-2 v-2 h-2 v-68 h2 v-2 h2 v-2 h4 v-2 h4 z'
new = 'M 82,26 h36 v2 h4 v2 h4 v2 h2 v2 h2 v2 h2 v68 h-2 v2 h-2 v2 h-2 v4 h-2 v2 h-4 v2 h-4 v2 h-6 v2 h-16 v-2 h-6 v-2 h-4 v-2 h-4 v-2 h-2 v-4 h-2 v-2 h-2 v-2 h-2 v-68 h2 v-2 h2 v-2 h4 v-2 h2 v-2 h-2 v-2 z'
if old in content:
    content = content.replace(old, new)
    print('Fixed head:oval')
else:
    print('WARN: head:oval path not found')

# head:round — (76,42) -> (78,38): from h4 z → need v-2 h2 v-2 before z
old = 'M 78,38 h44 v2 h4 v2 h4 v2 h2 v2 h2 v2 h2 v40 h-2 v2 h-2 v2 h-2 v4 h-4 v2 h-4 v2 h-44 v-2 h-4 v-2 h-4 v-4 h-2 v-2 h-2 v-2 h-2 v-40 h2 v-2 h2 v-2 h4 v-2 h4 z'
new = 'M 78,38 h44 v2 h4 v2 h4 v2 h2 v2 h2 v2 h2 v40 h-2 v2 h-2 v2 h-2 v4 h-4 v2 h-4 v2 h-44 v-2 h-4 v-2 h-4 v-4 h-2 v-2 h-2 v-2 h-2 v-40 h2 v-2 h2 v-2 h4 v-2 h2 v-2 h2 v-2 z'
if old in content:
    content = content.replace(old, new)
    print('Fixed head:round')
else:
    print('WARN: head:round path not found')

# head:round-wide — (74,50) -> (72,46): from h4 z → need v-2 h-2 v-2 before z
old = 'M 72,46 h56 v2 h4 v2 h4 v2 h2 v2 h2 v2 h2 v32 h-2 v2 h-2 v2 h-2 v4 h-4 v2 h-4 v2 h-8 v2 h-36 v-2 h-8 v-2 h-4 v-2 h-4 v-4 h-2 v-2 h-2 v-2 h-2 v-32 h2 v-2 h2 v-2 h4 v-2 h4 z'
new = 'M 72,46 h56 v2 h4 v2 h4 v2 h2 v2 h2 v2 h2 v32 h-2 v2 h-2 v2 h-2 v4 h-4 v2 h-4 v2 h-8 v2 h-36 v-2 h-8 v-2 h-4 v-2 h-4 v-4 h-2 v-2 h-2 v-2 h-2 v-32 h2 v-2 h2 v-2 h4 v-2 h2 v-2 h-2 v-2 z'
if old in content:
    content = content.replace(old, new)
    print('Fixed head:round-wide')
else:
    print('WARN: head:round-wide path not found')

# head:heart — (78,38) -> (78,34): dx=0, dy=-4. Need v-4 before z
old = 'M 78,34 h44 v2 h4 v2 h4 v2 h2 v2 h2 v2 h2 v40 h-2 v4 h-2 v4 h-2 v4 h-4 v4 h-4 v2 h-6 v2 h-8 v2 h-8 h-8 v-2 h-8 v-2 h-6 v-2 h-4 v-4 h-4 v-4 h-2 v-4 h-2 v-4 v-40 h2 v-2 h2 v-2 h4 v-2 h4 z'
new = 'M 78,34 h44 v2 h4 v2 h4 v2 h2 v2 h2 v2 h2 v40 h-2 v4 h-2 v4 h-2 v4 h-4 v4 h-4 v2 h-6 v2 h-8 v2 h-8 h-8 v-2 h-8 v-2 h-6 v-2 h-4 v-4 h-4 v-4 h-2 v-4 h-2 v-4 v-40 h2 v-2 h2 v-2 h4 v-2 h2 v-2 v-2 z'
if old in content:
    content = content.replace(old, new)
    print('Fixed head:heart')
else:
    print('WARN: head:heart path not found')

# head:soft-oval — (78,32) -> (78,28): dx=0, dy=-4. Need v-4 before z
old = 'M 78,28 h44 v2 h4 v2 h4 v2 h2 v2 h2 v2 h2 v60 h-2 v2 h-2 v2 h-4 v4 h-4 v2 h-6 v2 h-8 v2 h-18 v-2 h-8 v-2 h-6 v-2 h-4 v-4 h-4 v-2 h-2 v-2 h-2 v-60 h2 v-2 h2 v-2 h4 v-2 h4 z'
new = 'M 78,28 h44 v2 h4 v2 h4 v2 h2 v2 h2 v2 h2 v60 h-2 v2 h-2 v2 h-4 v4 h-4 v2 h-6 v2 h-8 v2 h-18 v-2 h-8 v-2 h-6 v-2 h-4 v-4 h-4 v-2 h-2 v-2 h-2 v-60 h2 v-2 h2 v-2 h4 v-2 h2 v-2 v-2 z'
if old in content:
    content = content.replace(old, new)
    print('Fixed head:soft-oval')
else:
    print('WARN: head:soft-oval path not found')

with open(svg_path, 'w') as f:
    f.write(content)

print('Done — verify with generate-gallery.ts')
