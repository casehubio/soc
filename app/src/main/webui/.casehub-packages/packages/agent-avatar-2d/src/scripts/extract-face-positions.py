"""
Extract face feature positions from original SVG heads.
Reads the source SVG where eyes/nose/mouth are embedded in each head,
extracts the y-positions and x-spacing for each head shape.
"""
import re
import sys

src = sys.argv[1]

with open(src) as f:
    content = f.read()

# Find each head symbol with its face features
for m in re.finditer(r'<symbol id="hd:(head-[^"]+)"[^>]*>([\s\S]*?)</symbol>', content):
    head_id = m.group(1)
    body = m.group(2)

    # Extract translate offset
    tm = re.search(r'translate\(0,(\d+)\)', body)
    offset = int(tm.group(1)) if tm else 0

    # Find eye positions (look for sclera rects)
    eye_ys = []
    eye_left_xs = []
    eye_right_xs = []
    in_eyes = False
    for line in body.split('\n'):
        stripped = line.strip()
        if 'Eyes' in stripped and stripped.startswith('<!--'):
            in_eyes = True
            continue
        if in_eyes and stripped.startswith('<!--'):
            in_eyes = False
            continue
        if in_eyes and '<rect' in stripped:
            rm = re.search(r'x="(\d+)".*?y="(\d+)".*?width="(\d+)".*?height="(\d+)"', stripped)
            if rm and 'opacity="0.95"' in stripped:  # sclera
                x, y, w = int(rm.group(1)), int(rm.group(2)), int(rm.group(3))
                eye_ys.append(y)
                if x < 100:
                    eye_left_xs.append(x)
                else:
                    eye_right_xs.append(x)

    # Find nose position
    nose_ys = []
    in_nose = False
    for line in body.split('\n'):
        stripped = line.strip()
        if 'Nose' in stripped and stripped.startswith('<!--'):
            in_nose = True
            continue
        if in_nose and stripped.startswith('<!--'):
            in_nose = False
            continue
        if in_nose and '<rect' in stripped:
            rm = re.search(r'y="(\d+)"', stripped)
            if rm:
                nose_ys.append(int(rm.group(1)))

    # Find mouth position
    mouth_ys = []
    in_mouth = False
    for line in body.split('\n'):
        stripped = line.strip()
        if 'Mouth' in stripped and stripped.startswith('<!--'):
            in_mouth = True
            continue
        if in_mouth and stripped.startswith('<!--'):
            in_mouth = False
            continue
        if in_mouth and '<rect' in stripped:
            rm = re.search(r'y="(\d+)"', stripped)
            if rm:
                mouth_ys.append(int(rm.group(1)))

    # Compute positions
    eye_y = min(eye_ys) if eye_ys else None
    left_x = min(eye_left_xs) if eye_left_xs else None
    right_x = min(eye_right_xs) if eye_right_xs else None
    nose_y = min(nose_ys) if nose_ys else None
    mouth_y = min(mouth_ys) if mouth_ys else None

    name = head_id.replace('head-', '')
    print(f"  '{name}': {{ yOffset: {offset}, eyeY: {eye_y}, eyeLeftX: {left_x}, eyeRightX: {right_x}, noseY: {nose_y}, mouthY: {mouth_y} }},")
