"""
Generate all missing SVG symbols for the mythic collection.
Appends to mythic.parts.svg before the closing </svg> tag.

Categories: eyes, nose, mouth, hat, expression, acc, missing costumes, missing props, missing beard
"""
import sys

dst = sys.argv[1]

with open(dst) as f:
    content = f.read()

# Remove closing </svg> — we'll re-add it at the end
content = content.rstrip()
if content.endswith('</svg>'):
    content = content[:-6].rstrip()

symbols = []

def sym(id, body):
    symbols.append(f'<symbol id="{id}" viewBox="0 0 200 240">\n{body}\n</symbol>')

# ============================================================
# EYES (6 types) — composable eye layers using var(--iris)
# All centred on face: left eye ~x=82, right eye ~x=104, y=68
# ============================================================

sym('eyes:standard', """  <!-- Standard eyes: 14x10 sclera, 6x6 iris -->
  <!-- Left eye -->
  <rect x="82" y="68" width="14" height="10" fill="#dde4e8" opacity="0.95"/>
  <rect x="82" y="68" width="14" height="2" fill="#3a2520" opacity="0.5"/>
  <rect x="82" y="76" width="14" height="2" fill="#3a2520" opacity="0.2"/>
  <rect x="88" y="70" width="6" height="6" fill="var(--iris)"/>
  <rect x="90" y="70" width="4" height="6" fill="var(--iris-dark)"/>
  <rect x="90" y="72" width="4" height="4" fill="#111"/>
  <rect x="88" y="70" width="2" height="2" fill="#fff"/>
  <!-- Right eye -->
  <rect x="104" y="68" width="14" height="10" fill="#dde4e8" opacity="0.95"/>
  <rect x="104" y="68" width="14" height="2" fill="#3a2520" opacity="0.5"/>
  <rect x="104" y="76" width="14" height="2" fill="#3a2520" opacity="0.2"/>
  <rect x="108" y="70" width="6" height="6" fill="var(--iris)"/>
  <rect x="110" y="70" width="4" height="6" fill="var(--iris-dark)"/>
  <rect x="110" y="72" width="4" height="4" fill="#111"/>
  <rect x="108" y="70" width="2" height="2" fill="#fff"/>""")

sym('eyes:large', """  <!-- Large eyes: 16x12 sclera, 8x8 iris — animated, expressive -->
  <!-- Left eye -->
  <rect x="80" y="66" width="16" height="12" fill="#dde4e8" opacity="0.95"/>
  <rect x="80" y="66" width="16" height="2" fill="#3a2520" opacity="0.5"/>
  <rect x="80" y="76" width="16" height="2" fill="#3a2520" opacity="0.2"/>
  <rect x="84" y="68" width="8" height="8" fill="var(--iris)"/>
  <rect x="86" y="68" width="6" height="8" fill="var(--iris-dark)"/>
  <rect x="88" y="70" width="4" height="6" fill="#111"/>
  <rect x="84" y="68" width="2" height="2" fill="#fff"/>
  <!-- Right eye -->
  <rect x="104" y="66" width="16" height="12" fill="#dde4e8" opacity="0.95"/>
  <rect x="104" y="66" width="16" height="2" fill="#3a2520" opacity="0.5"/>
  <rect x="104" y="76" width="16" height="2" fill="#3a2520" opacity="0.2"/>
  <rect x="108" y="68" width="8" height="8" fill="var(--iris)"/>
  <rect x="110" y="68" width="6" height="8" fill="var(--iris-dark)"/>
  <rect x="112" y="70" width="4" height="6" fill="#111"/>
  <rect x="108" y="68" width="2" height="2" fill="#fff"/>""")

sym('eyes:narrow', """  <!-- Narrow eyes: 14x6 sclera, 6x4 iris — hooded, determined -->
  <!-- Left eye -->
  <rect x="82" y="70" width="14" height="6" fill="#dde4e8" opacity="0.95"/>
  <rect x="82" y="70" width="14" height="2" fill="#3a2520" opacity="0.6"/>
  <rect x="82" y="74" width="14" height="2" fill="#3a2520" opacity="0.2"/>
  <rect x="88" y="70" width="6" height="4" fill="var(--iris)"/>
  <rect x="90" y="70" width="4" height="4" fill="var(--iris-dark)"/>
  <rect x="90" y="70" width="4" height="4" fill="#111" opacity="0.6"/>
  <rect x="88" y="70" width="2" height="2" fill="#fff"/>
  <!-- Heavy lid -->
  <rect x="80" y="68" width="18" height="2" fill="var(--skin)"/>
  <!-- Right eye -->
  <rect x="104" y="70" width="14" height="6" fill="#dde4e8" opacity="0.95"/>
  <rect x="104" y="70" width="14" height="2" fill="#3a2520" opacity="0.6"/>
  <rect x="104" y="74" width="14" height="2" fill="#3a2520" opacity="0.2"/>
  <rect x="108" y="70" width="6" height="4" fill="var(--iris)"/>
  <rect x="110" y="70" width="4" height="4" fill="var(--iris-dark)"/>
  <rect x="110" y="70" width="4" height="4" fill="#111" opacity="0.6"/>
  <rect x="108" y="70" width="2" height="2" fill="#fff"/>
  <rect x="102" y="68" width="18" height="2" fill="var(--skin)"/>""")

sym('eyes:round', """  <!-- Round eyes: 10x10 sclera, 6x6 iris — innocent, wide-eyed -->
  <!-- Left eye -->
  <rect x="84" y="66" width="10" height="10" fill="#dde4e8" opacity="0.95"/>
  <rect x="84" y="66" width="10" height="2" fill="#3a2520" opacity="0.5"/>
  <rect x="84" y="74" width="10" height="2" fill="#3a2520" opacity="0.2"/>
  <rect x="86" y="68" width="6" height="6" fill="var(--iris)"/>
  <rect x="88" y="68" width="4" height="6" fill="var(--iris-dark)"/>
  <rect x="88" y="70" width="4" height="4" fill="#111"/>
  <rect x="86" y="68" width="2" height="2" fill="#fff"/>
  <!-- Right eye -->
  <rect x="106" y="66" width="10" height="10" fill="#dde4e8" opacity="0.95"/>
  <rect x="106" y="66" width="10" height="2" fill="#3a2520" opacity="0.5"/>
  <rect x="106" y="74" width="10" height="2" fill="#3a2520" opacity="0.2"/>
  <rect x="108" y="68" width="6" height="6" fill="var(--iris)"/>
  <rect x="110" y="68" width="4" height="6" fill="var(--iris-dark)"/>
  <rect x="110" y="70" width="4" height="4" fill="#111"/>
  <rect x="108" y="68" width="2" height="2" fill="#fff"/>""")

sym('eyes:almond', """  <!-- Almond eyes: 16x8 tapered sclera, 6x6 iris — elegant -->
  <!-- Left eye -->
  <rect x="82" y="68" width="14" height="8" fill="#dde4e8" opacity="0.95"/>
  <rect x="80" y="70" width="2" height="4" fill="#dde4e8" opacity="0.5"/>
  <rect x="96" y="70" width="2" height="4" fill="#dde4e8" opacity="0.5"/>
  <rect x="82" y="68" width="14" height="2" fill="#3a2520" opacity="0.5"/>
  <rect x="82" y="74" width="14" height="2" fill="#3a2520" opacity="0.2"/>
  <rect x="88" y="70" width="6" height="6" fill="var(--iris)"/>
  <rect x="90" y="70" width="4" height="6" fill="var(--iris-dark)"/>
  <rect x="90" y="72" width="4" height="4" fill="#111"/>
  <rect x="88" y="70" width="2" height="2" fill="#fff"/>
  <!-- Right eye -->
  <rect x="104" y="68" width="14" height="8" fill="#dde4e8" opacity="0.95"/>
  <rect x="102" y="70" width="2" height="4" fill="#dde4e8" opacity="0.5"/>
  <rect x="118" y="70" width="2" height="4" fill="#dde4e8" opacity="0.5"/>
  <rect x="104" y="68" width="14" height="2" fill="#3a2520" opacity="0.5"/>
  <rect x="104" y="74" width="14" height="2" fill="#3a2520" opacity="0.2"/>
  <rect x="108" y="70" width="6" height="6" fill="var(--iris)"/>
  <rect x="110" y="70" width="4" height="6" fill="var(--iris-dark)"/>
  <rect x="110" y="72" width="4" height="4" fill="#111"/>
  <rect x="108" y="70" width="2" height="2" fill="#fff"/>""")

sym('eyes:deep-set', """  <!-- Deep-set eyes: 14x8 sclera, heavy lid shadow — brooding, intense -->
  <!-- Left eye shadow -->
  <rect x="80" y="66" width="18" height="4" fill="#000" opacity="0.15"/>
  <!-- Left eye -->
  <rect x="82" y="70" width="14" height="8" fill="#dde4e8" opacity="0.9"/>
  <rect x="82" y="70" width="14" height="2" fill="#3a2520" opacity="0.6"/>
  <rect x="82" y="76" width="14" height="2" fill="#3a2520" opacity="0.2"/>
  <rect x="88" y="72" width="6" height="6" fill="var(--iris)"/>
  <rect x="90" y="72" width="4" height="6" fill="var(--iris-dark)"/>
  <rect x="90" y="74" width="4" height="4" fill="#111"/>
  <rect x="88" y="72" width="2" height="2" fill="#fff"/>
  <!-- Right eye shadow -->
  <rect x="102" y="66" width="18" height="4" fill="#000" opacity="0.15"/>
  <!-- Right eye -->
  <rect x="104" y="70" width="14" height="8" fill="#dde4e8" opacity="0.9"/>
  <rect x="104" y="70" width="14" height="2" fill="#3a2520" opacity="0.6"/>
  <rect x="104" y="76" width="14" height="2" fill="#3a2520" opacity="0.2"/>
  <rect x="108" y="72" width="6" height="6" fill="var(--iris)"/>
  <rect x="110" y="72" width="4" height="6" fill="var(--iris-dark)"/>
  <rect x="110" y="74" width="4" height="4" fill="#111"/>
  <rect x="108" y="72" width="2" height="2" fill="#fff"/>""")

# ============================================================
# NOSES (6 types) — semi-transparent overlays on skin
# Centred at x=98-102, y=80-92
# ============================================================

sym('nose:subtle', """  <!-- Subtle nose: 4px bridge, small nostrils -->
  <rect x="98" y="82" width="4" height="8" fill="#000" opacity="0.08"/>
  <rect x="96" y="88" width="2" height="2" fill="#000" opacity="0.12"/>
  <rect x="102" y="88" width="2" height="2" fill="#000" opacity="0.12"/>
  <rect x="96" y="90" width="8" height="2" fill="#000" opacity="0.05"/>""")

sym('nose:prominent', """  <!-- Prominent nose: 8px bridge, large nostrils -->
  <rect x="96" y="78" width="8" height="14" fill="#000" opacity="0.12"/>
  <rect x="94" y="82" width="4" height="8" fill="#000" opacity="0.06"/>
  <rect x="102" y="82" width="4" height="8" fill="#000" opacity="0.06"/>
  <rect x="94" y="88" width="4" height="4" fill="#000" opacity="0.22"/>
  <rect x="102" y="88" width="4" height="4" fill="#000" opacity="0.22"/>
  <rect x="92" y="92" width="16" height="2" fill="#000" opacity="0.08"/>
  <rect x="102" y="80" width="2" height="6" fill="#fff" opacity="0.08"/>""")

sym('nose:button', """  <!-- Button nose: short, round, youthful -->
  <rect x="96" y="84" width="8" height="6" fill="#000" opacity="0.1"/>
  <rect x="94" y="86" width="4" height="4" fill="#000" opacity="0.06"/>
  <rect x="102" y="86" width="4" height="4" fill="#000" opacity="0.06"/>
  <rect x="96" y="88" width="2" height="2" fill="#000" opacity="0.15"/>
  <rect x="102" y="88" width="2" height="2" fill="#000" opacity="0.15"/>
  <rect x="94" y="90" width="12" height="2" fill="#000" opacity="0.06"/>""")

sym('nose:narrow', """  <!-- Narrow nose: 4px very faint, refined -->
  <rect x="98" y="80" width="4" height="10" fill="#000" opacity="0.06"/>
  <rect x="98" y="88" width="2" height="2" fill="#000" opacity="0.1"/>
  <rect x="100" y="88" width="2" height="2" fill="#000" opacity="0.1"/>
  <rect x="100" y="82" width="2" height="4" fill="#fff" opacity="0.06"/>""")

sym('nose:aquiline', """  <!-- Aquiline nose: 12px pronounced, distinguished -->
  <rect x="96" y="76" width="8" height="16" fill="#000" opacity="0.1"/>
  <rect x="94" y="80" width="4" height="10" fill="#000" opacity="0.06"/>
  <rect x="100" y="80" width="6" height="10" fill="#000" opacity="0.06"/>
  <rect x="94" y="90" width="4" height="2" fill="#000" opacity="0.2"/>
  <rect x="100" y="92" width="4" height="2" fill="#000" opacity="0.2"/>
  <rect x="92" y="92" width="16" height="2" fill="#000" opacity="0.08"/>
  <rect x="102" y="78" width="2" height="8" fill="#fff" opacity="0.08"/>""")

sym('nose:broad', """  <!-- Broad nose: 8px flat, wide base (16px) -->
  <rect x="96" y="80" width="8" height="10" fill="#000" opacity="0.1"/>
  <rect x="92" y="84" width="6" height="6" fill="#000" opacity="0.06"/>
  <rect x="102" y="84" width="6" height="6" fill="#000" opacity="0.06"/>
  <rect x="92" y="88" width="4" height="4" fill="#000" opacity="0.18"/>
  <rect x="104" y="88" width="4" height="4" fill="#000" opacity="0.18"/>
  <rect x="90" y="92" width="20" height="2" fill="#000" opacity="0.08"/>""")

# ============================================================
# MOUTHS (8 types) — at y=96
# line-* = masculine (dark crease), lips-* = feminine (lip colour)
# ============================================================

sym('mouth:line-neutral', """  <!-- Line neutral: 20px dark crease, male default -->
  <rect x="90" y="96" width="20" height="2" fill="#000" opacity="0.3"/>
  <rect x="88" y="96" width="2" height="2" fill="#000" opacity="0.15"/>
  <rect x="110" y="96" width="2" height="2" fill="#000" opacity="0.15"/>
  <rect x="92" y="98" width="16" height="2" fill="#000" opacity="0.08"/>""")

sym('mouth:line-wide', """  <!-- Line wide: 32px grin, expressive -->
  <rect x="84" y="96" width="32" height="2" fill="#000" opacity="0.3"/>
  <rect x="82" y="94" width="2" height="2" fill="#000" opacity="0.12"/>
  <rect x="116" y="94" width="2" height="2" fill="#000" opacity="0.12"/>
  <rect x="88" y="98" width="24" height="2" fill="#000" opacity="0.08"/>""")

sym('mouth:line-stern', """  <!-- Line stern: 16px downturned, serious -->
  <rect x="92" y="96" width="16" height="2" fill="#000" opacity="0.35"/>
  <rect x="90" y="98" width="4" height="2" fill="#000" opacity="0.2"/>
  <rect x="106" y="98" width="4" height="2" fill="#000" opacity="0.2"/>
  <rect x="94" y="98" width="12" height="2" fill="#000" opacity="0.08"/>""")

sym('mouth:smile', """  <!-- Smile: 20px upturned, friendly (gender-neutral) -->
  <rect x="90" y="96" width="20" height="2" fill="#000" opacity="0.3"/>
  <rect x="88" y="94" width="2" height="2" fill="#000" opacity="0.15"/>
  <rect x="110" y="94" width="2" height="2" fill="#000" opacity="0.15"/>
  <rect x="92" y="98" width="16" height="2" fill="#000" opacity="0.06"/>""")

sym('mouth:lips-natural', """  <!-- Lips natural: 20px subtle rose, female default -->
  <rect x="90" y="94" width="20" height="2" fill="#cc8888" opacity="0.25"/>
  <rect x="90" y="96" width="20" height="4" fill="#cc8888" opacity="0.4"/>
  <rect x="88" y="96" width="2" height="2" fill="#cc8888" opacity="0.2"/>
  <rect x="110" y="96" width="2" height="2" fill="#cc8888" opacity="0.2"/>
  <rect x="92" y="100" width="16" height="2" fill="#000" opacity="0.06"/>""")

sym('mouth:lips-full', """  <!-- Lips full: 22px prominent rose, cupid's bow -->
  <rect x="92" y="92" width="6" height="2" fill="#cc7777" opacity="0.35"/>
  <rect x="102" y="92" width="6" height="2" fill="#cc7777" opacity="0.35"/>
  <rect x="89" y="94" width="22" height="2" fill="#cc7777" opacity="0.45"/>
  <rect x="89" y="96" width="22" height="4" fill="#cc7777" opacity="0.55"/>
  <rect x="87" y="96" width="2" height="2" fill="#cc7777" opacity="0.25"/>
  <rect x="111" y="96" width="2" height="2" fill="#cc7777" opacity="0.25"/>
  <rect x="93" y="100" width="14" height="2" fill="#000" opacity="0.08"/>""")

sym('mouth:smirk', """  <!-- Smirk: 18px asymmetric, cocky -->
  <rect x="90" y="96" width="18" height="2" fill="#000" opacity="0.3"/>
  <rect x="106" y="94" width="4" height="2" fill="#000" opacity="0.2"/>
  <rect x="88" y="96" width="2" height="2" fill="#000" opacity="0.1"/>
  <rect x="92" y="98" width="14" height="2" fill="#000" opacity="0.06"/>""")

sym('mouth:small', """  <!-- Small: 14px, quiet, reserved (gender-neutral) -->
  <rect x="93" y="96" width="14" height="2" fill="#000" opacity="0.25"/>
  <rect x="95" y="98" width="10" height="2" fill="#000" opacity="0.06"/>""")

# ============================================================
# HATS (6 types) — sit on top of head, y=6-30
# ============================================================

sym('hat:flower-crown', """  <!-- Flower crown: woven vine with flowers -->
  <!-- Vine band (thin, organic) -->
  <rect x="76" y="24" width="48" height="4" fill="#3a7a3a"/>
  <rect x="74" y="24" width="4" height="4" fill="#3a7a3a" opacity="0.6"/>
  <rect x="124" y="24" width="4" height="4" fill="#3a7a3a" opacity="0.6"/>
  <rect x="78" y="26" width="44" height="2" fill="#2a5a2a" opacity="0.5"/>
  <!-- Leaves (alternating, organic) -->
  <rect x="84" y="22" width="4" height="4" fill="#4a9a4a"/>
  <rect x="94" y="22" width="4" height="4" fill="#4a9a4a"/>
  <rect x="104" y="22" width="4" height="4" fill="#4a9a4a"/>
  <rect x="114" y="22" width="4" height="4" fill="#4a9a4a"/>
  <!-- Flowers (daisy shape: center + petals) -->
  <rect x="80" y="20" width="2" height="2" fill="#e85080"/>
  <rect x="78" y="18" width="6" height="2" fill="#f0a0b0"/>
  <rect x="80" y="16" width="2" height="2" fill="#f0a0b0"/>
  <rect x="80" y="22" width="2" height="2" fill="#f0a0b0"/>
  <rect x="98" y="20" width="2" height="2" fill="#f0c040"/>
  <rect x="96" y="18" width="6" height="2" fill="#f8e080"/>
  <rect x="98" y="16" width="2" height="2" fill="#f8e080"/>
  <rect x="98" y="22" width="2" height="2" fill="#f8e080"/>
  <rect x="112" y="20" width="2" height="2" fill="#e85080"/>
  <rect x="110" y="18" width="6" height="2" fill="#f0a0b0"/>
  <rect x="112" y="16" width="2" height="2" fill="#f0a0b0"/>""")

sym('hat:beret', """  <!-- Beret: tilted disc, artist style -->
  <rect x="72" y="18" width="48" height="4" fill="var(--secondary)"/>
  <rect x="68" y="14" width="52" height="6" fill="var(--secondary)"/>
  <rect x="72" y="10" width="44" height="6" fill="var(--secondary)"/>
  <rect x="78" y="8" width="32" height="4" fill="var(--secondary)"/>
  <rect x="66" y="16" width="8" height="6" fill="var(--secondary)"/>
  <rect x="94" y="6" width="6" height="4" fill="var(--secondary)"/>""")

sym('hat:baseball-cap', """  <!-- Baseball cap: forward-facing, bill shadow -->
  <rect x="74" y="20" width="52" height="6" fill="var(--secondary)"/>
  <rect x="78" y="14" width="44" height="8" fill="var(--secondary)"/>
  <rect x="82" y="10" width="36" height="6" fill="var(--secondary)"/>
  <rect x="72" y="26" width="28" height="4" fill="var(--secondary)"/>
  <rect x="70" y="28" width="4" height="2" fill="var(--secondary)"/>
  <rect x="72" y="28" width="28" height="2" fill="#000" opacity="0.2"/>""")

sym('hat:explorer', """  <!-- Explorer hat: wide brim, adventure style -->
  <rect x="60" y="22" width="80" height="4" fill="#8b6b3d"/>
  <rect x="56" y="22" width="4" height="4" fill="#8b6b3d"/>
  <rect x="140" y="22" width="4" height="4" fill="#8b6b3d"/>
  <rect x="74" y="14" width="52" height="10" fill="#a07840"/>
  <rect x="78" y="10" width="44" height="6" fill="#a07840"/>
  <rect x="82" y="8" width="36" height="4" fill="#a07840"/>
  <rect x="76" y="24" width="48" height="2" fill="#6b4b2d"/>""")

sym('hat:jester', """  <!-- Jester hat: multi-pointed with bells -->
  <rect x="78" y="18" width="44" height="8" fill="var(--primary)"/>
  <rect x="82" y="12" width="36" height="8" fill="var(--primary)"/>
  <rect x="70" y="6" width="16" height="14" fill="var(--primary)"/>
  <rect x="114" y="6" width="16" height="14" fill="var(--secondary)"/>
  <rect x="90" y="2" width="20" height="12" fill="var(--secondary)"/>
  <rect x="66" y="4" width="6" height="6" fill="#f0c040"/>
  <rect x="126" y="4" width="6" height="6" fill="#f0c040"/>
  <rect x="96" y="0" width="6" height="6" fill="#f0c040"/>""")

sym('hat:crown', """  <!-- Crown: golden with jewels -->
  <rect x="76" y="18" width="48" height="8" fill="#c9a227"/>
  <rect x="78" y="12" width="44" height="8" fill="#c9a227"/>
  <rect x="80" y="8" width="8" height="6" fill="#c9a227"/>
  <rect x="96" y="6" width="8" height="8" fill="#c9a227"/>
  <rect x="112" y="8" width="8" height="6" fill="#c9a227"/>
  <rect x="82" y="10" width="4" height="2" fill="#cc2222"/>
  <rect x="98" y="8" width="4" height="2" fill="#2244cc"/>
  <rect x="114" y="10" width="4" height="2" fill="#cc2222"/>
  <rect x="78" y="24" width="44" height="2" fill="#a08020"/>""")

# ============================================================
# EXPRESSIONS (16) — face overlay modifiers
# ============================================================

sym('expression:rosy-cheeks', """  <!-- Rosy cheeks: pink blush patches -->
  <rect x="74" y="80" width="10" height="10" fill="#cc7766" opacity="0.25"/>
  <rect x="76" y="78" width="6" height="4" fill="#cc7766" opacity="0.15"/>
  <rect x="116" y="80" width="10" height="10" fill="#cc7766" opacity="0.2"/>
  <rect x="118" y="78" width="6" height="4" fill="#cc7766" opacity="0.12"/>""")

sym('expression:furrowed-brows', """  <!-- Furrowed brows: downward angled stress lines -->
  <rect x="82" y="60" width="2" height="2" fill="#000" opacity="0.3"/>
  <rect x="94" y="60" width="2" height="2" fill="#000" opacity="0.3"/>
  <rect x="104" y="60" width="2" height="2" fill="#000" opacity="0.3"/>
  <rect x="116" y="60" width="2" height="2" fill="#000" opacity="0.3"/>
  <rect x="96" y="62" width="8" height="2" fill="#000" opacity="0.15"/>""")

sym('expression:sweat-drop', """  <!-- Sweat drop: single drop at right temple -->
  <rect x="128" y="54" width="4" height="2" fill="#88bbee" opacity="0.7"/>
  <rect x="128" y="56" width="6" height="4" fill="#88bbee" opacity="0.6"/>
  <rect x="130" y="60" width="4" height="4" fill="#88bbee" opacity="0.5"/>
  <rect x="132" y="64" width="2" height="2" fill="#88bbee" opacity="0.4"/>
  <rect x="130" y="56" width="2" height="2" fill="#fff" opacity="0.4"/>""")

sym('expression:sparkle-eyes', """  <!-- Sparkle eyes: star highlights in eye area -->
  <rect x="86" y="68" width="2" height="2" fill="#fff" opacity="0.8"/>
  <rect x="84" y="70" width="2" height="2" fill="#fff" opacity="0.5"/>
  <rect x="88" y="70" width="2" height="2" fill="#fff" opacity="0.5"/>
  <rect x="86" y="72" width="2" height="2" fill="#fff" opacity="0.5"/>
  <rect x="110" y="68" width="2" height="2" fill="#fff" opacity="0.8"/>
  <rect x="108" y="70" width="2" height="2" fill="#fff" opacity="0.5"/>
  <rect x="112" y="70" width="2" height="2" fill="#fff" opacity="0.5"/>
  <rect x="110" y="72" width="2" height="2" fill="#fff" opacity="0.5"/>""")

sym('expression:idea-spark', """  <!-- Idea spark: lightbulb spark above head -->
  <rect x="126" y="16" width="8" height="2" fill="#f0c040" opacity="0.8"/>
  <rect x="128" y="12" width="4" height="10" fill="#f0c040" opacity="0.7"/>
  <rect x="124" y="14" width="2" height="2" fill="#f0c040" opacity="0.5"/>
  <rect x="134" y="14" width="2" height="2" fill="#f0c040" opacity="0.5"/>
  <rect x="126" y="10" width="2" height="2" fill="#f0c040" opacity="0.5"/>
  <rect x="132" y="10" width="2" height="2" fill="#f0c040" opacity="0.5"/>""")

sym('expression:raised-brow', """  <!-- Raised brow: right eyebrow lifted -->
  <rect x="104" y="58" width="14" height="2" fill="#000" opacity="0.2"/>
  <rect x="102" y="60" width="2" height="2" fill="#000" opacity="0.15"/>""")

sym('expression:starry-eyes', """  <!-- Starry eyes: star-shaped highlights -->
  <rect x="86" y="68" width="2" height="6" fill="#f0c040" opacity="0.6"/>
  <rect x="84" y="70" width="6" height="2" fill="#f0c040" opacity="0.6"/>
  <rect x="84" y="68" width="2" height="2" fill="#f0c040" opacity="0.3"/>
  <rect x="88" y="68" width="2" height="2" fill="#f0c040" opacity="0.3"/>
  <rect x="110" y="68" width="2" height="6" fill="#f0c040" opacity="0.6"/>
  <rect x="108" y="70" width="6" height="2" fill="#f0c040" opacity="0.6"/>
  <rect x="108" y="68" width="2" height="2" fill="#f0c040" opacity="0.3"/>
  <rect x="112" y="68" width="2" height="2" fill="#f0c040" opacity="0.3"/>""")

sym('expression:squint-joy', """  <!-- Squint joy: narrowed happy eyes (lines replace open eyes) -->
  <rect x="82" y="72" width="14" height="2" fill="#000" opacity="0.3"/>
  <rect x="80" y="70" width="2" height="2" fill="#000" opacity="0.15"/>
  <rect x="96" y="70" width="2" height="2" fill="#000" opacity="0.15"/>
  <rect x="104" y="72" width="14" height="2" fill="#000" opacity="0.3"/>
  <rect x="102" y="70" width="2" height="2" fill="#000" opacity="0.15"/>
  <rect x="118" y="70" width="2" height="2" fill="#000" opacity="0.15"/>""")

sym('expression:flat-brows', """  <!-- Flat brows: dead straight, neutral expression -->
  <rect x="82" y="62" width="14" height="2" fill="#000" opacity="0.2"/>
  <rect x="104" y="62" width="14" height="2" fill="#000" opacity="0.2"/>""")

sym('expression:angry-vein', """  <!-- Angry vein: throbbing cross-mark at temple -->
  <rect x="124" y="42" width="8" height="2" fill="#cc4444" opacity="0.6"/>
  <rect x="126" y="40" width="2" height="6" fill="#cc4444" opacity="0.6"/>
  <rect x="128" y="44" width="4" height="2" fill="#cc4444" opacity="0.4"/>
  <rect x="130" y="42" width="2" height="4" fill="#cc4444" opacity="0.4"/>""")

sym('expression:wink', """  <!-- Wink: right eye closed (arc line) -->
  <rect x="104" y="72" width="14" height="2" fill="#000" opacity="0.3"/>
  <rect x="102" y="70" width="2" height="2" fill="#000" opacity="0.2"/>
  <rect x="118" y="70" width="2" height="2" fill="#000" opacity="0.2"/>
  <rect x="106" y="74" width="10" height="2" fill="#000" opacity="0.1"/>""")

sym('expression:dazed-spirals', """  <!-- Dazed spirals: spiral marks near eyes -->
  <rect x="76" y="66" width="4" height="2" fill="#8855aa" opacity="0.4"/>
  <rect x="74" y="68" width="2" height="4" fill="#8855aa" opacity="0.4"/>
  <rect x="76" y="72" width="4" height="2" fill="#8855aa" opacity="0.3"/>
  <rect x="78" y="70" width="2" height="2" fill="#8855aa" opacity="0.3"/>
  <rect x="120" y="66" width="4" height="2" fill="#8855aa" opacity="0.4"/>
  <rect x="124" y="68" width="2" height="4" fill="#8855aa" opacity="0.4"/>
  <rect x="120" y="72" width="4" height="2" fill="#8855aa" opacity="0.3"/>
  <rect x="120" y="70" width="2" height="2" fill="#8855aa" opacity="0.3"/>""")

sym('expression:heart-eyes', """  <!-- Heart eyes: heart shapes over eyes -->
  <rect x="84" y="66" width="4" height="2" fill="#ee3366" opacity="0.7"/>
  <rect x="90" y="66" width="4" height="2" fill="#ee3366" opacity="0.7"/>
  <rect x="82" y="68" width="14" height="4" fill="#ee3366" opacity="0.7"/>
  <rect x="84" y="72" width="10" height="2" fill="#ee3366" opacity="0.6"/>
  <rect x="86" y="74" width="6" height="2" fill="#ee3366" opacity="0.5"/>
  <rect x="88" y="76" width="2" height="2" fill="#ee3366" opacity="0.4"/>
  <rect x="106" y="66" width="4" height="2" fill="#ee3366" opacity="0.7"/>
  <rect x="112" y="66" width="4" height="2" fill="#ee3366" opacity="0.7"/>
  <rect x="104" y="68" width="14" height="4" fill="#ee3366" opacity="0.7"/>
  <rect x="106" y="72" width="10" height="2" fill="#ee3366" opacity="0.6"/>
  <rect x="108" y="74" width="6" height="2" fill="#ee3366" opacity="0.5"/>
  <rect x="110" y="76" width="2" height="2" fill="#ee3366" opacity="0.4"/>""")

# ============================================================
# ACCESSORIES (10 types) — small body/face additions
# ============================================================

sym('acc:headband', """  <!-- Headband: fabric band across forehead -->
  <rect x="72" y="28" width="56" height="4" fill="var(--accent)"/>
  <rect x="70" y="30" width="4" height="2" fill="var(--accent)"/>
  <rect x="128" y="30" width="4" height="2" fill="var(--accent)"/>""")

sym('acc:paint-splatters', """  <!-- Paint splatters: coloured dots on costume -->
  <rect x="74" y="168" width="4" height="4" fill="#e74c3c" opacity="0.7"/>
  <rect x="82" y="180" width="6" height="4" fill="#2ecc71" opacity="0.6"/>
  <rect x="110" y="172" width="4" height="6" fill="#3498db" opacity="0.7"/>
  <rect x="118" y="184" width="4" height="4" fill="#f1c40f" opacity="0.6"/>
  <rect x="90" y="190" width="6" height="4" fill="#9b59b6" opacity="0.5"/>""")

sym('acc:scarf-bandana', """  <!-- Scarf/bandana: fabric around neck -->
  <rect x="82" y="122" width="36" height="6" fill="var(--accent)"/>
  <rect x="80" y="124" width="4" height="8" fill="var(--accent)"/>
  <rect x="86" y="128" width="8" height="10" fill="var(--accent)"/>
  <rect x="84" y="130" width="4" height="8" fill="var(--accent)"/>""")

sym('acc:freckles', """  <!-- Freckles: small dots across cheeks/nose -->
  <rect x="78" y="80" width="2" height="2" fill="#8b6b4a" opacity="0.35"/>
  <rect x="82" y="82" width="2" height="2" fill="#8b6b4a" opacity="0.3"/>
  <rect x="76" y="84" width="2" height="2" fill="#8b6b4a" opacity="0.25"/>
  <rect x="80" y="86" width="2" height="2" fill="#8b6b4a" opacity="0.3"/>
  <rect x="116" y="80" width="2" height="2" fill="#8b6b4a" opacity="0.35"/>
  <rect x="120" y="82" width="2" height="2" fill="#8b6b4a" opacity="0.3"/>
  <rect x="118" y="84" width="2" height="2" fill="#8b6b4a" opacity="0.25"/>
  <rect x="122" y="86" width="2" height="2" fill="#8b6b4a" opacity="0.3"/>""")

sym('acc:nose-ring', """  <!-- Nose ring: small ring on left nostril -->
  <rect x="94" y="88" width="2" height="4" fill="#c0c0c0"/>
  <rect x="92" y="90" width="2" height="2" fill="#c0c0c0"/>
  <rect x="94" y="92" width="2" height="2" fill="#c0c0c0"/>""")

sym('acc:ear-piercings', """  <!-- Ear piercings: small studs on ears -->
  <rect x="64" y="72" width="2" height="2" fill="#c0c0c0"/>
  <rect x="64" y="76" width="2" height="2" fill="#c0c0c0"/>
  <rect x="134" y="72" width="2" height="2" fill="#c0c0c0"/>""")

sym('acc:scar', """  <!-- Scar: diagonal mark across cheek -->
  <rect x="118" y="74" width="2" height="2" fill="#aa8877" opacity="0.5"/>
  <rect x="120" y="76" width="2" height="4" fill="#aa8877" opacity="0.5"/>
  <rect x="122" y="80" width="2" height="4" fill="#aa8877" opacity="0.4"/>
  <rect x="124" y="84" width="2" height="2" fill="#aa8877" opacity="0.3"/>""")

sym('acc:tattoo', """  <!-- Tattoo: tribal mark on arm/shoulder area -->
  <rect x="56" y="156" width="6" height="2" fill="#222" opacity="0.5"/>
  <rect x="54" y="158" width="4" height="4" fill="#222" opacity="0.5"/>
  <rect x="58" y="160" width="4" height="6" fill="#222" opacity="0.4"/>
  <rect x="56" y="166" width="2" height="4" fill="#222" opacity="0.4"/>""")

sym('acc:pendant-amulet', """  <!-- Pendant amulet: chain with gemstone -->
  <rect x="98" y="126" width="4" height="2" fill="#c0c0c0" opacity="0.6"/>
  <rect x="96" y="128" width="2" height="4" fill="#c0c0c0" opacity="0.5"/>
  <rect x="102" y="128" width="2" height="4" fill="#c0c0c0" opacity="0.5"/>
  <rect x="96" y="132" width="8" height="6" fill="var(--accent)"/>
  <rect x="98" y="134" width="4" height="2" fill="#fff" opacity="0.3"/>""")

sym('acc:epaulettes', """  <!-- Epaulettes: shoulder decorations -->
  <rect x="56" y="138" width="12" height="4" fill="#c9a227"/>
  <rect x="54" y="140" width="4" height="4" fill="#c9a227"/>
  <rect x="58" y="142" width="6" height="2" fill="#c9a227"/>
  <rect x="58" y="138" width="6" height="2" fill="#fff" opacity="0.15"/>
  <rect x="132" y="138" width="12" height="4" fill="#c9a227"/>
  <rect x="142" y="140" width="4" height="4" fill="#c9a227"/>
  <rect x="136" y="142" width="6" height="2" fill="#c9a227"/>
  <rect x="136" y="138" width="6" height="2" fill="#fff" opacity="0.15"/>""")

# ============================================================
# MISSING BEARD (1)
# ============================================================

sym('beard:full-round', """  <!-- Full round beard: large rounded beard -->
  <rect x="80" y="96" width="40" height="4" fill="var(--hair-color)"/>
  <rect x="78" y="100" width="44" height="6" fill="var(--hair-color)"/>
  <rect x="76" y="106" width="48" height="6" fill="var(--hair-color)"/>
  <rect x="78" y="112" width="44" height="4" fill="var(--hair-color)"/>
  <rect x="82" y="116" width="36" height="4" fill="var(--hair-color)"/>
  <rect x="86" y="120" width="28" height="2" fill="var(--hair-color)"/>
  <rect x="90" y="122" width="20" height="2" fill="var(--hair-color)"/>
  <rect x="80" y="98" width="4" height="4" fill="#fff" opacity="0.06"/>""")

# ============================================================
# MISSING COSTUMES (6)
# ============================================================

sym('costume:vest-cross', """  <!-- Vest + cross: sturdy vest (y=114, matches soft-wrap) -->
  <clipPath id="vest-clip">
    <path d="M 42,114 h116 v8 h-4 v32 h-4 v20 h-4 v16 h-2 v14 h-2 v14 h-2 v22 h-80 v-22 h-2 v-14 h-2 v-14 h-2 v-16 h-4 v-20 h-4 v-32 h-4 z"/>
  </clipPath>
  <path d="M 46,114 h108 v40 h-4 v20 h-4 v16 h-2 v14 h-2 v14 h-2 v22 h-80 v-22 h-2 v-14 h-2 v-14 h-2 v-16 h-4 v-20 h-4 z" fill="var(--primary)"/>
  <rect x="42" y="114" width="6" height="8" fill="var(--primary)"/>
  <rect x="152" y="114" width="6" height="8" fill="var(--primary)"/>
  <rect x="56" y="108" width="22" height="8" fill="var(--primary)"/>
  <rect x="122" y="108" width="22" height="8" fill="var(--primary)"/>
  <g clip-path="url(#vest-clip)">
  <rect x="46" y="116" width="12" height="122" fill="#000" opacity="0.14"/>
  <rect x="58" y="118" width="6" height="112" fill="#000" opacity="0.06"/>
  <rect x="136" y="116" width="12" height="28" fill="#fff" opacity="0.08"/>
  <!-- Collar -->
  <rect x="82" y="110" width="36" height="10" fill="var(--primary)"/>
  <rect x="78" y="114" width="8" height="6" fill="var(--primary)"/>
  <rect x="114" y="114" width="8" height="6" fill="var(--primary)"/>
  <rect x="84" y="110" width="32" height="2" fill="#fff" opacity="0.08"/>
  <!-- Cross symbol -->
  <rect x="96" y="152" width="8" height="24" fill="#cc2222"/>
  <rect x="90" y="158" width="20" height="8" fill="#cc2222"/>
  <rect x="96" y="154" width="8" height="2" fill="#fff" opacity="0.15"/>
  </g>
  <!-- Arm fills (skin — vest is sleeveless) -->
  <rect x="48" y="136" width="14" height="56" fill="var(--skin)"/>
  <rect x="138" y="136" width="14" height="56" fill="var(--skin)"/>""")

sym('costume:business', """  <!-- Business suit: formal jacket (y=126, matches robes/lab-coat/smock majority) -->
  <clipPath id="biz-clip">
    <path d="M 42,126 h116 v8 h-4 v32 h-4 v20 h-4 v16 h-2 v14 h-2 v14 h-2 v16 h-80 v-16 h-2 v-14 h-2 v-14 h-2 v-16 h-4 v-20 h-4 v-32 h-4 z"/>
  </clipPath>
  <path d="M 46,126 h108 v40 h-4 v20 h-4 v16 h-2 v14 h-2 v14 h-2 v16 h-80 v-16 h-2 v-14 h-2 v-14 h-2 v-16 h-4 v-20 h-4 z" fill="var(--primary)"/>
  <rect x="42" y="126" width="6" height="8" fill="var(--primary)"/>
  <rect x="152" y="126" width="6" height="8" fill="var(--primary)"/>
  <rect x="56" y="120" width="22" height="8" fill="var(--primary)"/>
  <rect x="56" y="120" width="22" height="2" fill="#fff" opacity="0.06"/>
  <rect x="122" y="120" width="22" height="8" fill="var(--primary)"/>
  <g clip-path="url(#biz-clip)">
  <rect x="46" y="128" width="12" height="110" fill="#000" opacity="0.16"/>
  <rect x="58" y="130" width="6" height="100" fill="#000" opacity="0.08"/>
  <rect x="136" y="128" width="14" height="28" fill="#fff" opacity="0.08"/>
  <!-- Lapels -->
  <rect x="80" y="128" width="8" height="34" fill="var(--primary)"/>
  <rect x="112" y="128" width="8" height="34" fill="var(--primary)"/>
  <rect x="82" y="128" width="6" height="32" fill="#fff" opacity="0.1"/>
  <rect x="114" y="128" width="6" height="32" fill="#fff" opacity="0.1"/>
  <!-- Shirt -->
  <rect x="88" y="128" width="24" height="72" fill="#e8e4e0"/>
  <!-- Tie -->
  <rect x="96" y="126" width="8" height="4" fill="var(--accent)"/>
  <rect x="97" y="130" width="6" height="40" fill="var(--accent)"/>
  <rect x="98" y="170" width="4" height="4" fill="var(--accent)"/>
  </g>
  <!-- Arms -->
  <rect x="46" y="148" width="14" height="44" fill="var(--primary)"/>
  <rect x="140" y="148" width="14" height="44" fill="var(--primary)"/>
  <rect x="46" y="148" width="14" height="4" fill="#000" opacity="0.06"/>
  <rect x="140" y="148" width="14" height="4" fill="#000" opacity="0.06"/>""")

sym('costume:explorer-jacket', """  <!-- Explorer jacket: rugged (y=120, matches utility-vest) -->
  <clipPath id="explore-clip">
    <path d="M 42,120 h116 v8 h-4 v32 h-4 v20 h-4 v16 h-2 v14 h-2 v14 h-2 v16 h-80 v-16 h-2 v-14 h-2 v-14 h-2 v-16 h-4 v-20 h-4 v-32 h-4 z"/>
  </clipPath>
  <path d="M 46,120 h108 v40 h-4 v20 h-4 v16 h-2 v14 h-2 v14 h-2 v16 h-80 v-16 h-2 v-14 h-2 v-14 h-2 v-16 h-4 v-20 h-4 z" fill="var(--primary)"/>
  <rect x="42" y="120" width="6" height="8" fill="var(--primary)"/>
  <rect x="152" y="120" width="6" height="8" fill="var(--primary)"/>
  <rect x="56" y="114" width="22" height="8" fill="var(--primary)"/>
  <rect x="122" y="114" width="22" height="8" fill="var(--primary)"/>
  <g clip-path="url(#explore-clip)">
  <rect x="46" y="122" width="12" height="116" fill="#000" opacity="0.16"/>
  <rect x="58" y="124" width="6" height="106" fill="#000" opacity="0.08"/>
  <rect x="136" y="122" width="14" height="28" fill="#fff" opacity="0.08"/>
  <!-- Collar -->
  <rect x="80" y="116" width="40" height="10" fill="var(--primary)"/>
  <rect x="82" y="116" width="36" height="2" fill="#fff" opacity="0.06"/>
  <!-- Pockets -->
  <rect x="70" y="164" width="16" height="12" fill="var(--secondary)"/>
  <rect x="70" y="164" width="16" height="2" fill="#000" opacity="0.15"/>
  <rect x="114" y="164" width="16" height="12" fill="var(--secondary)"/>
  <rect x="114" y="164" width="16" height="2" fill="#000" opacity="0.15"/>
  <!-- Zipper line -->
  <rect x="99" y="124" width="2" height="76" fill="#000" opacity="0.15"/>
  </g>
  <!-- Arms -->
  <rect x="46" y="142" width="14" height="50" fill="var(--primary)"/>
  <rect x="140" y="142" width="14" height="50" fill="var(--primary)"/>
  <rect x="46" y="142" width="14" height="4" fill="#000" opacity="0.06"/>
  <rect x="140" y="142" width="14" height="4" fill="#000" opacity="0.06"/>""")

sym('costume:polo', """  <!-- Polo shirt: collared casual (y=120, matches plain-shirt) -->
  <clipPath id="polo-clip">
    <path d="M 42,120 h116 v8 h-4 v32 h-4 v20 h-4 v16 h-2 v14 h-2 v14 h-2 v16 h-80 v-16 h-2 v-14 h-2 v-14 h-2 v-16 h-4 v-20 h-4 v-32 h-4 z"/>
  </clipPath>
  <path d="M 46,120 h108 v40 h-4 v20 h-4 v16 h-2 v14 h-2 v14 h-2 v16 h-80 v-16 h-2 v-14 h-2 v-14 h-2 v-16 h-4 v-20 h-4 z" fill="var(--primary)"/>
  <rect x="42" y="120" width="6" height="8" fill="var(--primary)"/>
  <rect x="152" y="120" width="6" height="8" fill="var(--primary)"/>
  <rect x="56" y="114" width="22" height="8" fill="var(--primary)"/>
  <rect x="122" y="114" width="22" height="8" fill="var(--primary)"/>
  <g clip-path="url(#polo-clip)">
  <rect x="46" y="122" width="10" height="116" fill="#000" opacity="0.12"/>
  <rect x="136" y="122" width="12" height="28" fill="#fff" opacity="0.06"/>
  <!-- Collar -->
  <rect x="82" y="114" width="36" height="10" fill="var(--primary)"/>
  <rect x="80" y="116" width="4" height="6" fill="var(--primary)"/>
  <rect x="116" y="116" width="4" height="6" fill="var(--primary)"/>
  <rect x="84" y="114" width="32" height="2" fill="#fff" opacity="0.1"/>
  <!-- Placket -->
  <rect x="96" y="122" width="8" height="24" fill="var(--primary)"/>
  <rect x="97" y="124" width="6" height="20" fill="#000" opacity="0.06"/>
  <rect x="98" y="128" width="4" height="2" fill="var(--secondary)"/>
  <rect x="98" y="134" width="4" height="2" fill="var(--secondary)"/>
  </g>
  <!-- Arms (skin — short sleeves) -->
  <rect x="48" y="142" width="14" height="50" fill="var(--skin)"/>
  <rect x="138" y="142" width="14" height="50" fill="var(--skin)"/>""")

sym('costume:hoodie', """  <!-- Hoodie: casual (y=112, matches performer for Jester) -->
  <clipPath id="hoodie-clip">
    <path d="M 42,112 h116 v8 h-4 v32 h-4 v20 h-4 v16 h-2 v14 h-2 v14 h-2 v24 h-80 v-24 h-2 v-14 h-2 v-14 h-2 v-16 h-4 v-20 h-4 v-32 h-4 z"/>
  </clipPath>
  <path d="M 46,112 h108 v40 h-4 v20 h-4 v16 h-2 v14 h-2 v14 h-2 v24 h-80 v-24 h-2 v-14 h-2 v-14 h-2 v-16 h-4 v-20 h-4 z" fill="var(--primary)"/>
  <rect x="42" y="112" width="6" height="8" fill="var(--primary)"/>
  <rect x="152" y="112" width="6" height="8" fill="var(--primary)"/>
  <rect x="56" y="106" width="22" height="8" fill="var(--primary)"/>
  <rect x="122" y="106" width="22" height="8" fill="var(--primary)"/>
  <g clip-path="url(#hoodie-clip)">
  <rect x="46" y="114" width="12" height="124" fill="#000" opacity="0.16"/>
  <rect x="58" y="116" width="6" height="114" fill="#000" opacity="0.08"/>
  <rect x="136" y="114" width="12" height="28" fill="#fff" opacity="0.08"/>
  <!-- Hood (around neck) -->
  <rect x="72" y="108" width="56" height="14" fill="var(--primary)"/>
  <rect x="68" y="112" width="8" height="10" fill="var(--primary)"/>
  <rect x="124" y="112" width="8" height="10" fill="var(--primary)"/>
  <rect x="74" y="110" width="52" height="2" fill="#fff" opacity="0.08"/>
  <rect x="72" y="120" width="56" height="2" fill="#000" opacity="0.12"/>
  <!-- Zipper -->
  <rect x="99" y="122" width="2" height="54" fill="#000" opacity="0.12"/>
  <!-- Kangaroo pocket -->
  <rect x="82" y="170" width="36" height="16" fill="var(--secondary)" opacity="0.4"/>
  <rect x="82" y="170" width="36" height="2" fill="#000" opacity="0.1"/>
  </g>
  <!-- Arms (sleeved) -->
  <rect x="46" y="134" width="14" height="58" fill="var(--primary)"/>
  <rect x="140" y="134" width="14" height="58" fill="var(--primary)"/>
  <rect x="46" y="134" width="14" height="4" fill="#000" opacity="0.08"/>
  <rect x="140" y="134" width="14" height="4" fill="#000" opacity="0.08"/>""")

sym('costume:diplomatic', """  <!-- Diplomatic suit: clean, pocket square -->
  <clipPath id="diplo-clip">
    <path d="M 42,126 h116 v8 h-4 v32 h-4 v20 h-4 v16 h-2 v14 h-2 v14 h-2 v16 h-80 v-16 h-2 v-14 h-2 v-14 h-2 v-16 h-4 v-20 h-4 v-32 h-4 z"/>
  </clipPath>
  <path d="M 46,126 h108 v40 h-4 v20 h-4 v16 h-2 v14 h-2 v14 h-2 v16 h-80 v-16 h-2 v-14 h-2 v-14 h-2 v-16 h-4 v-20 h-4 z" fill="var(--primary)"/>
  <rect x="42" y="126" width="6" height="8" fill="var(--primary)"/>
  <rect x="152" y="126" width="6" height="8" fill="var(--primary)"/>
  <!-- Shoulder notch -->
  <rect x="56" y="120" width="22" height="8" fill="var(--primary)"/>
  <rect x="56" y="120" width="22" height="2" fill="#fff" opacity="0.06"/>
  <rect x="122" y="120" width="22" height="8" fill="var(--primary)"/>
  <g clip-path="url(#diplo-clip)">
  <!-- Gradient shading -->
  <rect x="46" y="128" width="12" height="110" fill="#000" opacity="0.16"/>
  <rect x="58" y="130" width="6" height="100" fill="#000" opacity="0.08"/>
  <rect x="136" y="128" width="14" height="28" fill="#fff" opacity="0.08"/>
  <!-- Lapels -->
  <rect x="80" y="128" width="8" height="34" fill="var(--primary)"/>
  <rect x="112" y="128" width="8" height="34" fill="var(--primary)"/>
  <rect x="82" y="128" width="6" height="32" fill="#fff" opacity="0.08"/>
  <rect x="114" y="128" width="6" height="32" fill="#fff" opacity="0.08"/>
  <!-- Shirt -->
  <rect x="88" y="128" width="24" height="72" fill="#e8e4e0"/>
  <!-- Tie -->
  <rect x="96" y="126" width="8" height="4" fill="var(--secondary)"/>
  <rect x="97" y="130" width="6" height="38" fill="var(--secondary)"/>
  <rect x="98" y="168" width="4" height="4" fill="var(--secondary)"/>
  <!-- Pocket square -->
  <rect x="70" y="152" width="8" height="4" fill="#e8e4e0"/>
  <rect x="72" y="150" width="4" height="4" fill="#e8e4e0"/>
  </g>
  <!-- Arms -->
  <rect x="46" y="148" width="14" height="44" fill="var(--primary)"/>
  <rect x="140" y="148" width="14" height="44" fill="var(--primary)"/>
  <rect x="46" y="148" width="14" height="4" fill="#000" opacity="0.06"/>
  <rect x="140" y="148" width="14" height="4" fill="#000" opacity="0.06"/>""")

# ============================================================
# MISSING PROPS — handheld items, typically in hand area
# x=145-175, y=160-210 (right hand) or x=25-55 (left hand)
# ============================================================

# Prop helper: most props are in the right hand area
def prop(name, body):
    sym(f'prop:{name}', body)

prop('notebook', """  <!-- Notebook: small bound book -->
  <rect x="150" y="170" width="20" height="28" fill="var(--accent)"/>
  <rect x="150" y="170" width="20" height="2" fill="#000" opacity="0.15"/>
  <rect x="152" y="174" width="16" height="2" fill="#000" opacity="0.1"/>
  <rect x="152" y="178" width="16" height="2" fill="#000" opacity="0.1"/>
  <rect x="152" y="182" width="12" height="2" fill="#000" opacity="0.1"/>
  <rect x="150" y="170" width="2" height="28" fill="#000" opacity="0.2"/>""")

prop('chalk', """  <!-- Chalk: small white stick -->
  <rect x="152" y="178" width="4" height="16" fill="#e8e4dc"/>
  <rect x="152" y="192" width="4" height="2" fill="#ccc"/>
  <rect x="152" y="178" width="4" height="2" fill="#fff" opacity="0.3"/>""")

prop('feathers', """  <!-- Feathers: two decorative feathers -->
  <rect x="152" y="164" width="2" height="24" fill="var(--accent)"/>
  <rect x="150" y="168" width="2" height="16" fill="var(--accent)" opacity="0.7"/>
  <rect x="154" y="166" width="2" height="20" fill="var(--accent)" opacity="0.7"/>
  <rect x="158" y="168" width="2" height="20" fill="var(--secondary)"/>
  <rect x="156" y="172" width="2" height="14" fill="var(--secondary)" opacity="0.7"/>
  <rect x="160" y="170" width="2" height="16" fill="var(--secondary)" opacity="0.7"/>""")

prop('rosetta-stone', """  <!-- Rosetta stone: inscribed tablet -->
  <rect x="148" y="168" width="22" height="28" fill="#7a7a6a"/>
  <rect x="148" y="168" width="22" height="2" fill="#8a8a7a"/>
  <rect x="150" y="172" width="18" height="2" fill="#000" opacity="0.15"/>
  <rect x="150" y="176" width="16" height="2" fill="#000" opacity="0.15"/>
  <rect x="150" y="180" width="18" height="2" fill="#000" opacity="0.12"/>
  <rect x="150" y="184" width="14" height="2" fill="#000" opacity="0.12"/>
  <rect x="150" y="188" width="16" height="2" fill="#000" opacity="0.1"/>""")

prop('olive-branch', """  <!-- Olive branch: peace symbol -->
  <rect x="150" y="170" width="2" height="20" fill="#4a6a3a"/>
  <rect x="148" y="174" width="4" height="4" fill="#6a8a5a"/>
  <rect x="146" y="168" width="4" height="4" fill="#6a8a5a"/>
  <rect x="152" y="176" width="4" height="4" fill="#6a8a5a"/>
  <rect x="152" y="168" width="4" height="4" fill="#6a8a5a"/>
  <rect x="148" y="180" width="4" height="4" fill="#6a8a5a"/>""")

prop('treaty', """  <!-- Treaty: rolled document with seal -->
  <rect x="152" y="172" width="16" height="22" fill="#f0e8d0"/>
  <rect x="152" y="172" width="16" height="2" fill="#d8d0b8"/>
  <rect x="152" y="192" width="16" height="2" fill="#d8d0b8"/>
  <rect x="154" y="176" width="12" height="2" fill="#000" opacity="0.08"/>
  <rect x="154" y="180" width="12" height="2" fill="#000" opacity="0.08"/>
  <rect x="164" y="188" width="4" height="4" fill="#cc2222" opacity="0.7"/>""")

prop('scales', """  <!-- Scales of justice -->
  <rect x="154" y="164" width="2" height="28" fill="#888"/>
  <rect x="146" y="164" width="18" height="2" fill="#888"/>
  <rect x="144" y="168" width="8" height="2" fill="#aaa"/>
  <rect x="146" y="170" width="4" height="4" fill="#aaa" opacity="0.5"/>
  <rect x="160" y="168" width="8" height="2" fill="#aaa"/>
  <rect x="162" y="170" width="4" height="4" fill="#aaa" opacity="0.5"/>""")

prop('family-crest', """  <!-- Family crest: heraldic shield -->
  <rect x="150" y="168" width="16" height="20" fill="var(--accent)"/>
  <rect x="150" y="168" width="16" height="2" fill="#fff" opacity="0.15"/>
  <rect x="152" y="186" width="4" height="2" fill="var(--accent)"/>
  <rect x="160" y="186" width="4" height="2" fill="var(--accent)"/>
  <rect x="156" y="172" width="4" height="12" fill="var(--primary)"/>
  <rect x="152" y="176" width="12" height="4" fill="var(--primary)"/>""")

prop('orb-of-state', """  <!-- Orb of state: golden sphere with cross -->
  <rect x="150" y="172" width="16" height="16" fill="#c9a227"/>
  <rect x="152" y="170" width="12" height="2" fill="#c9a227"/>
  <rect x="152" y="188" width="12" height="2" fill="#c9a227"/>
  <rect x="148" y="176" width="2" height="8" fill="#c9a227"/>
  <rect x="166" y="176" width="2" height="8" fill="#c9a227"/>
  <rect x="156" y="166" width="4" height="6" fill="#c9a227"/>
  <rect x="155" y="164" width="6" height="2" fill="#c9a227"/>
  <rect x="154" y="170" width="8" height="2" fill="#fff" opacity="0.15"/>""")

prop('umbrella', """  <!-- Umbrella: held upright -->
  <rect x="154" y="162" width="2" height="32" fill="#5a3a2a"/>
  <rect x="144" y="158" width="24" height="4" fill="var(--accent)"/>
  <rect x="148" y="154" width="16" height="6" fill="var(--accent)"/>
  <rect x="142" y="160" width="2" height="2" fill="var(--accent)"/>
  <rect x="168" y="160" width="2" height="2" fill="var(--accent)"/>""")

prop('shield-small', """  <!-- Small shield: compact defensive -->
  <rect x="36" y="164" width="16" height="22" fill="var(--secondary)"/>
  <rect x="38" y="162" width="12" height="2" fill="var(--secondary)"/>
  <rect x="40" y="186" width="8" height="2" fill="var(--secondary)"/>
  <rect x="42" y="188" width="4" height="2" fill="var(--secondary)"/>
  <rect x="42" y="172" width="8" height="2" fill="var(--accent)"/>""")

prop('stethoscope', """  <!-- Stethoscope: medical instrument -->
  <rect x="86" y="140" width="4" height="8" fill="#555"/>
  <rect x="110" y="140" width="4" height="8" fill="#555"/>
  <rect x="88" y="148" width="24" height="2" fill="#555"/>
  <rect x="96" y="148" width="8" height="8" fill="#777"/>
  <rect x="98" y="150" width="4" height="4" fill="#999"/>""")

prop('herb-bundle', """  <!-- Herb bundle: tied herbs -->
  <rect x="150" y="172" width="6" height="20" fill="#4a7a3a"/>
  <rect x="148" y="174" width="4" height="16" fill="#5a8a4a"/>
  <rect x="156" y="176" width="4" height="14" fill="#3a6a2a"/>
  <rect x="150" y="186" width="8" height="4" fill="#8b6b3d"/>
  <rect x="148" y="170" width="4" height="4" fill="#6a9a5a"/>
  <rect x="154" y="170" width="4" height="4" fill="#5a8a4a"/>""")

prop('bandage', """  <!-- Bandage: rolled bandage -->
  <rect x="152" y="176" width="12" height="12" fill="#e8e0d0"/>
  <rect x="154" y="174" width="8" height="2" fill="#e8e0d0"/>
  <rect x="154" y="188" width="8" height="2" fill="#e8e0d0"/>
  <rect x="156" y="178" width="4" height="2" fill="#cc4444" opacity="0.5"/>""")

prop('toolkit', """  <!-- Toolkit: small toolbox -->
  <rect x="148" y="178" width="20" height="14" fill="var(--secondary)"/>
  <rect x="148" y="176" width="20" height="4" fill="var(--secondary)"/>
  <rect x="156" y="174" width="4" height="4" fill="#888"/>
  <rect x="148" y="178" width="20" height="2" fill="#000" opacity="0.15"/>""")

prop('palette', """  <!-- Artist palette: paint palette -->
  <rect x="34" y="170" width="22" height="16" fill="#c4a060"/>
  <rect x="36" y="168" width="18" height="2" fill="#c4a060"/>
  <rect x="36" y="186" width="18" height="2" fill="#c4a060"/>
  <rect x="42" y="172" width="4" height="4" fill="#e74c3c"/>
  <rect x="48" y="174" width="4" height="4" fill="#3498db"/>
  <rect x="38" y="178" width="4" height="4" fill="#f1c40f"/>
  <rect x="46" y="180" width="4" height="4" fill="#2ecc71"/>
  <rect x="40" y="174" width="4" height="4" fill="#c4a060"/>""")

prop('blueprint', """  <!-- Blueprint: rolled architectural plan -->
  <rect x="148" y="170" width="22" height="24" fill="#2a5a8a"/>
  <rect x="150" y="174" width="18" height="2" fill="#4a8acc" opacity="0.3"/>
  <rect x="150" y="178" width="18" height="2" fill="#4a8acc" opacity="0.3"/>
  <rect x="150" y="182" width="14" height="2" fill="#4a8acc" opacity="0.3"/>
  <rect x="168" y="172" width="4" height="20" fill="#2a5a8a"/>""")

prop('laptop', """  <!-- Laptop: open laptop computer -->
  <rect x="148" y="176" width="22" height="14" fill="#444"/>
  <rect x="150" y="178" width="18" height="10" fill="#3a5a8a"/>
  <rect x="146" y="190" width="26" height="4" fill="#555"/>
  <rect x="148" y="190" width="22" height="2" fill="#666"/>""")

prop('quill', """  <!-- Quill: feather pen -->
  <rect x="156" y="164" width="2" height="28" fill="#8b6b3d"/>
  <rect x="154" y="162" width="6" height="4" fill="var(--accent)"/>
  <rect x="152" y="160" width="4" height="4" fill="var(--accent)"/>
  <rect x="158" y="160" width="4" height="4" fill="var(--accent)"/>
  <rect x="150" y="158" width="4" height="4" fill="var(--accent)" opacity="0.7"/>""")

prop('open-book', """  <!-- Open book: spread pages -->
  <rect x="144" y="174" width="24" height="20" fill="#f0e8d0"/>
  <rect x="156" y="172" width="2" height="24" fill="#5a3a2a"/>
  <rect x="146" y="178" width="8" height="2" fill="#000" opacity="0.08"/>
  <rect x="146" y="182" width="8" height="2" fill="#000" opacity="0.08"/>
  <rect x="160" y="178" width="8" height="2" fill="#000" opacity="0.08"/>
  <rect x="160" y="182" width="8" height="2" fill="#000" opacity="0.08"/>""")

prop('telescope', """  <!-- Telescope: brass spyglass -->
  <rect x="150" y="174" width="20" height="6" fill="#c9a227"/>
  <rect x="148" y="172" width="6" height="10" fill="#a08020"/>
  <rect x="168" y="174" width="4" height="6" fill="#888"/>
  <rect x="152" y="174" width="16" height="2" fill="#fff" opacity="0.1"/>""")

prop('star-chart', """  <!-- Star chart: celestial map -->
  <rect x="148" y="172" width="20" height="22" fill="#1a1a3a"/>
  <rect x="150" y="174" width="2" height="2" fill="#fff" opacity="0.8"/>
  <rect x="158" y="178" width="2" height="2" fill="#fff" opacity="0.6"/>
  <rect x="154" y="182" width="2" height="2" fill="#fff" opacity="0.7"/>
  <rect x="162" y="174" width="2" height="2" fill="#fff" opacity="0.5"/>
  <rect x="156" y="188" width="2" height="2" fill="#fff" opacity="0.6"/>""")

prop('megaphone-small', """  <!-- Megaphone (small): handheld -->
  <rect x="152" y="174" width="8" height="8" fill="var(--accent)"/>
  <rect x="160" y="172" width="4" height="12" fill="var(--accent)"/>
  <rect x="164" y="170" width="4" height="16" fill="var(--accent)"/>
  <rect x="150" y="176" width="4" height="4" fill="#555"/>""")

prop('leaflet', """  <!-- Leaflet: small folded paper -->
  <rect x="36" y="178" width="16" height="12" fill="#f0e8d0"/>
  <rect x="36" y="178" width="16" height="2" fill="#ddd"/>
  <rect x="38" y="182" width="12" height="2" fill="#000" opacity="0.06"/>
  <rect x="38" y="186" width="10" height="2" fill="#000" opacity="0.06"/>""")

prop('pen', """  <!-- Pen: writing instrument -->
  <rect x="156" y="170" width="2" height="22" fill="#333"/>
  <rect x="156" y="168" width="2" height="4" fill="#c9a227"/>
  <rect x="156" y="190" width="2" height="4" fill="#777"/>""")

prop('phone', """  <!-- Phone: mobile device -->
  <rect x="152" y="174" width="12" height="20" fill="#333"/>
  <rect x="154" y="176" width="8" height="14" fill="#4a6a8a"/>
  <rect x="156" y="192" width="4" height="2" fill="#555"/>""")

prop('business-cards', """  <!-- Business cards: small stack -->
  <rect x="150" y="180" width="16" height="10" fill="#e8e4e0"/>
  <rect x="152" y="178" width="14" height="10" fill="#f0ece8"/>
  <rect x="154" y="182" width="10" height="2" fill="#000" opacity="0.06"/>
  <rect x="154" y="186" width="6" height="2" fill="#000" opacity="0.06"/>""")

prop('cloth', """  <!-- Cloth: cleaning rag -->
  <rect x="148" y="178" width="16" height="12" fill="var(--secondary)" opacity="0.7"/>
  <rect x="150" y="176" width="12" height="2" fill="var(--secondary)" opacity="0.5"/>
  <rect x="146" y="184" width="4" height="6" fill="var(--secondary)" opacity="0.5"/>""")

prop('rope', """  <!-- Rope: coiled rope -->
  <rect x="150" y="170" width="14" height="4" fill="#c4a060"/>
  <rect x="148" y="174" width="4" height="12" fill="#c4a060"/>
  <rect x="160" y="174" width="4" height="12" fill="#c4a060"/>
  <rect x="150" y="184" width="14" height="4" fill="#c4a060"/>
  <rect x="152" y="176" width="10" height="6" fill="#b09050"/>""")

prop('swiss-army', """  <!-- Swiss army knife: multi-tool -->
  <rect x="154" y="174" width="8" height="18" fill="#cc2222"/>
  <rect x="154" y="174" width="8" height="2" fill="#aa1111"/>
  <rect x="158" y="172" width="2" height="4" fill="#ccc"/>
  <rect x="160" y="180" width="4" height="2" fill="#ccc"/>
  <rect x="152" y="186" width="2" height="4" fill="#ccc"/>""")

prop('backpack', """  <!-- Backpack: on shoulder area -->
  <rect x="34" y="150" width="18" height="34" fill="var(--secondary)"/>
  <rect x="36" y="148" width="14" height="4" fill="var(--secondary)"/>
  <rect x="38" y="184" width="10" height="2" fill="var(--secondary)"/>
  <rect x="38" y="156" width="12" height="8" fill="var(--accent)" opacity="0.4"/>
  <rect x="38" y="156" width="12" height="2" fill="#000" opacity="0.15"/>""")

prop('flag', """  <!-- Flag: on short pole -->
  <rect x="156" y="162" width="2" height="32" fill="#5a3a2a"/>
  <rect x="158" y="162" width="14" height="10" fill="var(--accent)"/>
  <rect x="158" y="162" width="14" height="2" fill="#fff" opacity="0.1"/>""")

prop('machete', """  <!-- Machete: large blade -->
  <rect x="156" y="158" width="4" height="6" fill="#5a3a2a"/>
  <rect x="156" y="164" width="4" height="2" fill="#888"/>
  <rect x="155" y="166" width="6" height="28" fill="#b0b0b0"/>
  <rect x="157" y="168" width="2" height="24" fill="#ccc"/>""")

prop('lantern', """  <!-- Lantern: oil lantern glowing -->
  <rect x="152" y="170" width="12" height="4" fill="#5a3a2a"/>
  <rect x="150" y="174" width="16" height="16" fill="#f0c040" opacity="0.7"/>
  <rect x="152" y="176" width="12" height="12" fill="#f0c040" opacity="0.5"/>
  <rect x="150" y="190" width="16" height="4" fill="#5a3a2a"/>
  <rect x="156" y="168" width="4" height="4" fill="#5a3a2a"/>""")

prop('journal', """  <!-- Journal: leather-bound book -->
  <rect x="148" y="172" width="18" height="22" fill="#6a4a2a"/>
  <rect x="150" y="174" width="14" height="18" fill="#8a6a4a"/>
  <rect x="148" y="172" width="2" height="22" fill="#5a3a1a"/>
  <rect x="152" y="178" width="10" height="2" fill="#000" opacity="0.08"/>
  <rect x="152" y="182" width="10" height="2" fill="#000" opacity="0.08"/>""")

prop('medal', """  <!-- Medal: hanging from ribbon -->
  <rect x="92" y="146" width="16" height="4" fill="var(--accent)"/>
  <rect x="96" y="150" width="8" height="8" fill="#c9a227"/>
  <rect x="98" y="152" width="4" height="4" fill="#fff" opacity="0.2"/>""")

prop('wristbands', """  <!-- Wristbands: athletic wrist bands -->
  <rect x="46" y="186" width="12" height="4" fill="var(--accent)"/>
  <rect x="142" y="186" width="12" height="4" fill="var(--accent)"/>""")

prop('broken-chain', """  <!-- Broken chain: symbol of liberation -->
  <rect x="148" y="176" width="6" height="4" fill="#888"/>
  <rect x="150" y="180" width="6" height="4" fill="#888"/>
  <rect x="152" y="184" width="6" height="4" fill="#888"/>
  <rect x="160" y="178" width="6" height="4" fill="#888"/>
  <rect x="162" y="174" width="4" height="4" fill="#888"/>""")

prop('first-aid', """  <!-- First aid kit: white box with red cross -->
  <rect x="148" y="174" width="20" height="16" fill="#e8e4e0"/>
  <rect x="148" y="174" width="20" height="2" fill="#ccc"/>
  <rect x="155" y="178" width="6" height="10" fill="#cc2222"/>
  <rect x="152" y="181" width="12" height="4" fill="#cc2222"/>""")

prop('sword-hilt', """  <!-- Sword hilt: pommel and guard visible -->
  <rect x="156" y="170" width="4" height="6" fill="#5a3a2a"/>
  <rect x="150" y="176" width="16" height="4" fill="#c9a227"/>
  <rect x="156" y="180" width="4" height="14" fill="#b0b0b0"/>
  <rect x="157" y="182" width="2" height="10" fill="#ccc"/>""")

prop('spotlight', """  <!-- Spotlight: stage light beam -->
  <rect x="150" y="168" width="14" height="10" fill="#444"/>
  <rect x="152" y="166" width="10" height="2" fill="#555"/>
  <rect x="154" y="178" width="6" height="12" fill="#f0c040" opacity="0.3"/>
  <rect x="152" y="180" width="10" height="8" fill="#f0c040" opacity="0.15"/>""")

prop('mirror-mask', """  <!-- Mirror mask: reflective half-mask -->
  <rect x="150" y="170" width="16" height="18" fill="#c0c0c0"/>
  <rect x="152" y="172" width="4" height="4" fill="#333"/>
  <rect x="160" y="172" width="4" height="4" fill="#333"/>
  <rect x="154" y="180" width="8" height="4" fill="#aaa"/>
  <rect x="152" y="170" width="12" height="2" fill="#fff" opacity="0.2"/>""")

prop('speech-bubble', """  <!-- Speech bubble: thought/speech icon -->
  <rect x="126" y="40" width="24" height="16" fill="#fff"/>
  <rect x="128" y="38" width="20" height="2" fill="#fff"/>
  <rect x="128" y="56" width="6" height="2" fill="#fff"/>
  <rect x="126" y="40" width="24" height="2" fill="#ddd"/>
  <rect x="130" y="44" width="16" height="2" fill="#000" opacity="0.08"/>
  <rect x="130" y="48" width="12" height="2" fill="#000" opacity="0.08"/>""")

prop('gift-box', """  <!-- Gift box: wrapped present -->
  <rect x="150" y="176" width="16" height="16" fill="var(--accent)"/>
  <rect x="150" y="174" width="16" height="4" fill="var(--accent)"/>
  <rect x="156" y="174" width="4" height="18" fill="var(--secondary)"/>
  <rect x="150" y="180" width="16" height="4" fill="var(--secondary)"/>
  <rect x="154" y="172" width="8" height="4" fill="var(--secondary)"/>""")

prop('scarf-shared', """  <!-- Shared scarf: long scarf -->
  <rect x="148" y="170" width="20" height="6" fill="var(--accent)"/>
  <rect x="146" y="176" width="8" height="20" fill="var(--accent)"/>
  <rect x="160" y="176" width="8" height="18" fill="var(--accent)"/>""")

prop('grapes', """  <!-- Grapes: cluster of grapes -->
  <rect x="152" y="174" width="4" height="4" fill="#7a3a8a"/>
  <rect x="156" y="174" width="4" height="4" fill="#8a4a9a"/>
  <rect x="150" y="178" width="4" height="4" fill="#8a4a9a"/>
  <rect x="154" y="178" width="4" height="4" fill="#7a3a8a"/>
  <rect x="158" y="178" width="4" height="4" fill="#7a3a8a"/>
  <rect x="152" y="182" width="4" height="4" fill="#6a2a7a"/>
  <rect x="156" y="182" width="4" height="4" fill="#6a2a7a"/>
  <rect x="154" y="170" width="2" height="6" fill="#4a7a3a"/>""")

prop('address-book', """  <!-- Address book: tabbed book -->
  <rect x="150" y="172" width="16" height="22" fill="var(--primary)"/>
  <rect x="150" y="172" width="2" height="22" fill="#000" opacity="0.2"/>
  <rect x="164" y="176" width="4" height="4" fill="#f0e8d0"/>
  <rect x="164" y="184" width="4" height="4" fill="#f0e8d0"/>
  <rect x="154" y="176" width="8" height="2" fill="#000" opacity="0.08"/>
  <rect x="154" y="182" width="8" height="2" fill="#000" opacity="0.08"/>""")

prop('rose', """  <!-- Rose: single red rose -->
  <rect x="156" y="168" width="2" height="22" fill="#3a6a2a"/>
  <rect x="152" y="164" width="8" height="6" fill="#cc2244"/>
  <rect x="154" y="162" width="6" height="2" fill="#cc2244"/>
  <rect x="150" y="166" width="2" height="2" fill="#cc2244"/>
  <rect x="160" y="166" width="2" height="2" fill="#cc2244"/>
  <rect x="154" y="164" width="4" height="2" fill="#dd3355"/>
  <rect x="152" y="176" width="4" height="4" fill="#3a6a2a"/>""")

prop('poetry-book', """  <!-- Poetry book: ornate binding -->
  <rect x="150" y="172" width="16" height="22" fill="var(--accent)"/>
  <rect x="150" y="172" width="2" height="22" fill="#000" opacity="0.2"/>
  <rect x="152" y="174" width="12" height="18" fill="#000" opacity="0.05"/>
  <rect x="154" y="178" width="8" height="2" fill="#c9a227" opacity="0.4"/>
  <rect x="156" y="182" width="4" height="2" fill="#c9a227" opacity="0.4"/>""")

prop('glowing-orb', """  <!-- Glowing orb: magical sphere -->
  <rect x="150" y="172" width="16" height="16" fill="var(--accent)" opacity="0.7"/>
  <rect x="152" y="170" width="12" height="2" fill="var(--accent)" opacity="0.5"/>
  <rect x="152" y="188" width="12" height="2" fill="var(--accent)" opacity="0.5"/>
  <rect x="148" y="176" width="2" height="8" fill="var(--accent)" opacity="0.3"/>
  <rect x="166" y="176" width="2" height="8" fill="var(--accent)" opacity="0.3"/>
  <rect x="154" y="174" width="4" height="4" fill="#fff" opacity="0.3"/>""")

prop('smoke-wisps', """  <!-- Smoke wisps: ethereal trails -->
  <rect x="144" y="158" width="4" height="4" fill="#888" opacity="0.2"/>
  <rect x="148" y="154" width="4" height="6" fill="#888" opacity="0.15"/>
  <rect x="154" y="152" width="4" height="4" fill="#888" opacity="0.1"/>
  <rect x="160" y="156" width="4" height="4" fill="#888" opacity="0.15"/>
  <rect x="164" y="152" width="4" height="4" fill="#888" opacity="0.1"/>""")

prop('wrench-gear', """  <!-- Wrench + gear: engineering tool -->
  <rect x="154" y="168" width="4" height="22" fill="#888"/>
  <rect x="150" y="168" width="12" height="4" fill="#888"/>
  <rect x="156" y="170" width="4" height="2" fill="#666"/>
  <rect x="148" y="192" width="16" height="2" fill="#777"/>
  <rect x="152" y="192" width="8" height="4" fill="#777"/>""")

prop('schematic', """  <!-- Schematic: technical drawing -->
  <rect x="36" y="170" width="20" height="24" fill="#f0e8d0"/>
  <rect x="38" y="172" width="16" height="2" fill="#2a5a8a" opacity="0.3"/>
  <rect x="38" y="176" width="12" height="2" fill="#2a5a8a" opacity="0.3"/>
  <rect x="38" y="180" width="14" height="2" fill="#2a5a8a" opacity="0.3"/>
  <rect x="40" y="184" width="6" height="6" fill="#2a5a8a" opacity="0.2"/>""")

prop('circuit-traces', """  <!-- Circuit traces: PCB pattern -->
  <rect x="150" y="170" width="18" height="22" fill="#1a4a2a"/>
  <rect x="152" y="174" width="14" height="2" fill="#4aaa4a" opacity="0.5"/>
  <rect x="152" y="178" width="2" height="8" fill="#4aaa4a" opacity="0.5"/>
  <rect x="158" y="176" width="2" height="10" fill="#4aaa4a" opacity="0.5"/>
  <rect x="160" y="180" width="6" height="2" fill="#4aaa4a" opacity="0.5"/>
  <rect x="154" y="184" width="8" height="2" fill="#4aaa4a" opacity="0.5"/>""")

prop('periodic-table', """  <!-- Periodic table: element chart -->
  <rect x="148" y="170" width="22" height="22" fill="#e8e4e0"/>
  <rect x="150" y="172" width="4" height="4" fill="var(--primary)" opacity="0.5"/>
  <rect x="156" y="172" width="4" height="4" fill="var(--secondary)" opacity="0.5"/>
  <rect x="162" y="172" width="4" height="4" fill="var(--accent)" opacity="0.5"/>
  <rect x="150" y="178" width="4" height="4" fill="var(--accent)" opacity="0.4"/>
  <rect x="156" y="178" width="4" height="4" fill="var(--primary)" opacity="0.4"/>
  <rect x="162" y="178" width="4" height="4" fill="var(--secondary)" opacity="0.4"/>
  <rect x="150" y="184" width="4" height="4" fill="var(--secondary)" opacity="0.3"/>
  <rect x="156" y="184" width="4" height="4" fill="var(--accent)" opacity="0.3"/>""")

prop('megaphone', """  <!-- Megaphone: large protest megaphone -->
  <rect x="148" y="172" width="8" height="8" fill="#555"/>
  <rect x="156" y="168" width="6" height="16" fill="var(--accent)"/>
  <rect x="162" y="166" width="6" height="20" fill="var(--accent)"/>
  <rect x="168" y="164" width="4" height="24" fill="var(--accent)"/>
  <rect x="146" y="174" width="4" height="4" fill="#444"/>""")

prop('raised-fist', """  <!-- Raised fist: solidarity symbol -->
  <rect x="36" y="152" width="12" height="16" fill="var(--skin)"/>
  <rect x="34" y="154" width="4" height="12" fill="var(--skin)"/>
  <rect x="36" y="150" width="12" height="4" fill="var(--skin)"/>
  <rect x="38" y="152" width="2" height="2" fill="#000" opacity="0.15"/>
  <rect x="42" y="152" width="2" height="2" fill="#000" opacity="0.15"/>
  <rect x="46" y="152" width="2" height="2" fill="#000" opacity="0.15"/>""")

prop('poker-chip', """  <!-- Poker chip: casino chip -->
  <rect x="152" y="178" width="12" height="12" fill="var(--accent)"/>
  <rect x="154" y="176" width="8" height="2" fill="var(--accent)"/>
  <rect x="154" y="190" width="8" height="2" fill="var(--accent)"/>
  <rect x="156" y="182" width="4" height="4" fill="#fff" opacity="0.3"/>""")

prop('motorcycle-key', """  <!-- Motorcycle key: key with fob -->
  <rect x="154" y="176" width="4" height="14" fill="#888"/>
  <rect x="152" y="174" width="8" height="4" fill="#777"/>
  <rect x="154" y="172" width="4" height="4" fill="#777"/>
  <rect x="156" y="186" width="4" height="2" fill="#888"/>
  <rect x="156" y="190" width="2" height="2" fill="#888"/>""")

prop('hammer', """  <!-- Hammer: construction hammer -->
  <rect x="156" y="168" width="2" height="24" fill="#5a3a2a"/>
  <rect x="150" y="166" width="14" height="6" fill="#888"/>
  <rect x="148" y="164" width="6" height="8" fill="#888"/>
  <rect x="150" y="166" width="4" height="4" fill="#aaa"/>""")

prop('blueprint-torn', """  <!-- Torn blueprint: ripped technical drawing -->
  <rect x="148" y="170" width="20" height="22" fill="#2a5a8a"/>
  <rect x="150" y="174" width="16" height="2" fill="#4a8acc" opacity="0.3"/>
  <rect x="150" y="178" width="14" height="2" fill="#4a8acc" opacity="0.3"/>
  <rect x="166" y="174" width="4" height="8" fill="transparent"/>
  <rect x="164" y="182" width="6" height="4" fill="transparent"/>""")

prop('butterfly', """  <!-- Butterfly: colourful wings -->
  <rect x="150" y="170" width="6" height="8" fill="var(--accent)" opacity="0.7"/>
  <rect x="160" y="170" width="6" height="8" fill="var(--accent)" opacity="0.7"/>
  <rect x="148" y="172" width="4" height="4" fill="var(--accent)" opacity="0.5"/>
  <rect x="164" y="172" width="4" height="4" fill="var(--accent)" opacity="0.5"/>
  <rect x="156" y="170" width="4" height="12" fill="#333"/>""")

prop('dandelion', """  <!-- Dandelion: seed head -->
  <rect x="156" y="180" width="2" height="14" fill="#4a7a3a"/>
  <rect x="152" y="170" width="10" height="10" fill="#f0e8d0" opacity="0.6"/>
  <rect x="154" y="168" width="6" height="2" fill="#f0e8d0" opacity="0.4"/>
  <rect x="154" y="180" width="6" height="2" fill="#f0e8d0" opacity="0.4"/>
  <rect x="150" y="174" width="2" height="2" fill="#f0e8d0" opacity="0.3"/>
  <rect x="162" y="174" width="2" height="2" fill="#f0e8d0" opacity="0.3"/>""")

prop('cloud', """  <!-- Cloud: small fluffy cloud -->
  <rect x="148" y="170" width="20" height="8" fill="#e8e8f0" opacity="0.8"/>
  <rect x="150" y="168" width="14" height="4" fill="#e8e8f0" opacity="0.7"/>
  <rect x="154" y="166" width="8" height="4" fill="#e8e8f0" opacity="0.6"/>
  <rect x="146" y="174" width="4" height="4" fill="#e8e8f0" opacity="0.5"/>""")

prop('stars', """  <!-- Stars: small constellation -->
  <rect x="152" y="168" width="2" height="2" fill="#f0c040" opacity="0.8"/>
  <rect x="160" y="172" width="2" height="2" fill="#f0c040" opacity="0.7"/>
  <rect x="156" y="178" width="2" height="2" fill="#f0c040" opacity="0.6"/>
  <rect x="148" y="174" width="2" height="2" fill="#f0c040" opacity="0.5"/>
  <rect x="164" y="166" width="2" height="2" fill="#f0c040" opacity="0.5"/>""")

prop('candle', """  <!-- Candle: lit candle -->
  <rect x="156" y="178" width="4" height="14" fill="#e8e0d0"/>
  <rect x="156" y="176" width="4" height="4" fill="#f0c040" opacity="0.8"/>
  <rect x="157" y="174" width="2" height="4" fill="#f09020" opacity="0.7"/>
  <rect x="158" y="172" width="2" height="2" fill="#f0c040" opacity="0.4"/>""")

prop('banner', """  <!-- Banner: small held flag/banner -->
  <rect x="156" y="164" width="2" height="28" fill="#5a3a2a"/>
  <rect x="158" y="166" width="12" height="16" fill="var(--accent)"/>
  <rect x="158" y="166" width="12" height="2" fill="#fff" opacity="0.1"/>
  <rect x="160" y="170" width="8" height="2" fill="var(--primary)" opacity="0.3"/>""")

prop('spark', """  <!-- Spark: creative spark/lightning -->
  <rect x="156" y="166" width="4" height="2" fill="#f0c040" opacity="0.9"/>
  <rect x="154" y="168" width="4" height="2" fill="#f0c040" opacity="0.8"/>
  <rect x="156" y="170" width="6" height="2" fill="#f0c040" opacity="0.9"/>
  <rect x="158" y="172" width="4" height="2" fill="#f0c040" opacity="0.7"/>
  <rect x="156" y="174" width="4" height="2" fill="#f0c040" opacity="0.6"/>""")

prop('music-notes', """  <!-- Music notes: floating notes -->
  <rect x="150" y="168" width="4" height="4" fill="#333" opacity="0.6"/>
  <rect x="152" y="162" width="2" height="8" fill="#333" opacity="0.5"/>
  <rect x="160" y="164" width="4" height="4" fill="#333" opacity="0.6"/>
  <rect x="162" y="158" width="2" height="8" fill="#333" opacity="0.5"/>
  <rect x="152" y="160" width="12" height="2" fill="#333" opacity="0.4"/>""")

prop('shadow-self', """  <!-- Shadow self: dark silhouette -->
  <rect x="148" y="164" width="16" height="28" fill="#222" opacity="0.3"/>
  <rect x="150" y="160" width="12" height="6" fill="#222" opacity="0.3"/>
  <rect x="152" y="158" width="8" height="4" fill="#222" opacity="0.25"/>""")

# Write everything
with open(dst) as f:
    content = f.read()

content = content.rstrip()
if content.endswith('</svg>'):
    content = content[:-6].rstrip()

content += '\n\n' + '\n\n'.join(symbols) + '\n\n</svg>\n'

with open(dst, 'w') as f:
    f.write(content)

total = content.count('<symbol ')
print(f'Added {len(symbols)} symbols. Total: {total}')
