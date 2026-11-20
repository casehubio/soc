import type { HeadFaceSpec, PartAssignment, PartPositionDelta } from './types.js';

function pa(
  head: string, eyes: string, nose: string, mouth: string,
  hair: string, facialHair: string, costume: string,
  eyebrows: string, glasses: string | null, hat: string | null,
  expression: string | null, props: readonly string[], accessories: readonly string[],
): PartAssignment {
  return { head, eyes, nose, mouth, hair, facialHair, costume, eyebrows, glasses, hat, expression, props, accessories };
}

export const ARCHETYPE_CONFIGS: Record<string, PartAssignment> = {
  // --- Caregiver (head: round) ---
  'Caregiver/Angel':     pa('round', 'round', 'button', 'lips-natural', 'shoulder-wavy', 'none', 'soft-wrap', 'soft-rounded', null, 'flower-crown', 'rosy-cheeks', ['halo', 'dove'], []),
  'Caregiver/Guardian':  pa('round', 'standard', 'prominent', 'line-neutral', 'afro-short', 'full-round', 'vest-cross', 'thick-straight', null, null, 'furrowed-brows', ['umbrella', 'shield-small'], []),
  'Caregiver/Healer':    pa('round', 'round', 'subtle', 'lips-natural', 'long-flowing', 'none', 'soft-wrap', 'concerned', null, null, 'rosy-cheeks', ['stethoscope', 'herb-bundle'], []),
  'Caregiver/Samaritan': pa('round', 'standard', 'button', 'smile', 'cropped-fringe', 'stubble', 'vest-cross', 'soft-rounded', null, null, 'sweat-drop', ['bandage', 'toolkit'], ['headband']),

  // --- Creator (head: soft-oval) ---
  'Creator/Artist':       pa('soft-oval', 'large', 'broad', 'lips-natural', 'messy-bun', 'none', 'smock', 'raised', 'cat-eye', 'beret', 'sparkle-eyes', ['paintbrush', 'palette'], ['paint-splatters']),
  'Creator/Entrepreneur': pa('soft-oval', 'almond', 'narrow', 'small', 'pixie', 'none', 'business', 'thick-straight', 'thick-rect', null, 'idea-spark', ['blueprint', 'laptop'], []),
  'Creator/Storyteller':  pa('soft-oval', 'standard', 'prominent', 'smirk', 'shoulder-wavy', 'goatee', 'smock', 'raised', null, null, 'raised-brow', ['quill', 'open-book'], ['scarf-bandana']),
  'Creator/Visionary':    pa('soft-oval', 'large', 'aquiline', 'small', 'wild-einstein', 'none', 'business', 'raised', 'thick-rect', null, 'starry-eyes', ['telescope', 'star-chart'], []),

  // --- Everyman (head: standard) ---
  'Everyman/Advocate':  pa('standard', 'standard', 'broad', 'line-wide', 'cropped-fringe', 'none', 'polo', 'raised', 'half-rim', null, 'raised-brow', ['megaphone-small', 'leaflet'], []),
  'Everyman/Citizen':   pa('standard', 'standard', 'subtle', 'line-neutral', 'afro-short', 'stubble', 'plain-shirt', 'soft-rounded', null, 'baseball-cap', null, ['clipboard', 'pen'], ['freckles']),
  'Everyman/Networker': pa('standard', 'round', 'button', 'smile', 'slicked', 'none', 'polo', 'soft-rounded', null, null, 'squint-joy', ['phone', 'business-cards'], []),
  'Everyman/Servant':   pa('standard', 'narrow', 'narrow', 'small', 'buzz', 'none', 'plain-shirt', 'concerned', null, null, 'flat-brows', ['broom', 'cloth'], []),

  // --- Explorer (head: weathered) ---
  'Explorer/Adventurer':  pa('weathered', 'narrow', 'prominent', 'smirk', 'windswept', 'rugged', 'utility-vest', 'thick-straight', 'goggles', 'explorer', 'squint-joy', ['compass', 'rope'], []),
  'Explorer/Generalist':  pa('weathered', 'almond', 'broad', 'smile', 'shoulder-wavy', 'stubble', 'explorer-jacket', 'soft-rounded', null, null, null, ['swiss-army', 'backpack'], ['scarf-bandana']),
  'Explorer/Pioneer':     pa('weathered', 'deep-set', 'broad', 'line-stern', 'braids', 'rugged', 'utility-vest', 'thick-straight', 'aviator', null, 'furrowed-brows', ['flag', 'machete'], ['headband']),
  'Explorer/Seeker':      pa('weathered', 'almond', 'subtle', 'small', 'ponytail', 'none', 'explorer-jacket', 'concerned', null, null, null, ['lantern', 'journal'], []),

  // --- Hero (head: square-jaw) ---
  'Hero/Athlete':   pa('square-jaw', 'standard', 'narrow', 'line-stern', 'buzz', 'none', 'armour', 'thick-straight', null, null, 'furrowed-brows', ['medal', 'wristbands'], ['headband']),
  'Hero/Liberator': pa('square-jaw', 'deep-set', 'aquiline', 'line-stern', 'ponytail', 'heavy', 'business', 'angular', 'aviator', null, 'angry-vein', ['torch', 'broken-chain'], []),
  'Hero/Rescuer':   pa('square-jaw', 'standard', 'prominent', 'line-neutral', 'buzz', 'rugged', 'armour', 'angular', null, null, 'sweat-drop', ['first-aid', 'rope'], ['scar']),
  'Hero/Warrior':   pa('square-jaw', 'deep-set', 'prominent', 'line-wide', 'buzz', 'none', 'armour', 'angular', null, null, 'furrowed-brows', ['shield', 'sword-hilt'], ['scar']),

  // --- Innocent (head: round) ---
  'Innocent/Child':   pa('round', 'round', 'button', 'small', 'cropped-fringe', 'none', 'simple-dress', 'raised', null, null, 'rosy-cheeks', ['butterfly', 'dandelion'], ['freckles']),
  'Innocent/Dreamer': pa('round', 'large', 'subtle', 'lips-natural', 'long-flowing', 'none', 'simple-dress', 'soft-rounded', null, null, 'starry-eyes', ['cloud', 'stars'], []),
  'Innocent/Idealist':pa('round', 'round', 'subtle', 'smile', 'shoulder-wavy', 'none', 'simple-dress', 'raised', null, null, 'sparkle-eyes', ['candle', 'banner'], []),
  'Innocent/Muse':    pa('round', 'almond', 'narrow', 'lips-full', 'messy-bun', 'none', 'simple-dress', 'thin-arched', null, 'flower-crown', 'sparkle-eyes', ['spark', 'music-notes'], []),

  // --- Jester (head: round-wide) ---
  'Jester/Clown':       pa('round-wide', 'large', 'button', 'line-wide', 'wild-einstein', 'none', 'performer', 'raised', null, 'jester', 'squint-joy', ['juggling-balls', 'red-nose'], []),
  'Jester/Entertainer': pa('round-wide', 'large', 'subtle', 'lips-full', 'cropped-fringe', 'none', 'performer', 'raised', null, null, 'wink', ['microphone', 'spotlight'], []),
  'Jester/Provocateur': pa('round-wide', 'narrow', 'narrow', 'smirk', 'mohawk', 'stubble', 'hoodie', 'asymmetric', null, null, 'raised-brow', ['mirror-mask', 'speech-bubble'], ['nose-ring']),
  'Jester/Shapeshifter':pa('round-wide', 'almond', 'subtle', 'lips-natural', 'long-flowing', 'none', 'performer', 'thin-arched', 'cat-eye', null, 'dazed-spirals', ['playing-cards', 'shadow-self'], []),

  // --- Lover (head: heart) ---
  'Lover/Companion':  pa('heart', 'round', 'subtle', 'lips-natural', 'shoulder-wavy', 'none', 'romantic', 'soft-rounded', null, null, 'rosy-cheeks', ['gift-box', 'scarf-shared'], []),
  'Lover/Hedonist':   pa('heart', 'almond', 'aquiline', 'smirk', 'slicked', 'stubble', 'romantic', 'thin-arched', null, null, 'wink', ['wine-glass', 'grapes'], []),
  'Lover/Matchmaker': pa('heart', 'round', 'button', 'lips-natural', 'messy-bun', 'none', 'romantic', 'raised', null, null, 'squint-joy', ['ribbon', 'address-book'], []),
  'Lover/Romantic':   pa('heart', 'large', 'narrow', 'lips-full', 'long-flowing', 'none', 'romantic', 'soft-rounded', null, 'flower-crown', 'heart-eyes', ['rose', 'poetry-book'], []),

  // --- Magician (head: diamond) ---
  'Magician/Alchemist':  pa('diamond', 'almond', 'aquiline', 'line-neutral', 'long-flowing', 'goatee', 'robes', 'thin-arched', null, null, 'sparkle-eyes', ['glowing-orb', 'smoke-wisps'], ['pendant-amulet']),
  'Magician/Engineer':   pa('diamond', 'narrow', 'prominent', 'line-neutral', 'buzz', 'stubble', 'lab-coat', 'thick-straight', 'goggles', null, null, ['wrench-gear', 'schematic'], []),
  'Magician/Innovator':  pa('diamond', 'large', 'subtle', 'smile', 'pixie', 'none', 'business', 'raised', null, null, 'idea-spark', ['lightbulb', 'circuit-traces'], []),
  'Magician/Scientist':  pa('diamond', 'narrow', 'aquiline', 'small', 'bald-sides', 'goatee', 'lab-coat', 'thick-straight', 'pince-nez', null, 'raised-brow', ['flask', 'periodic-table'], []),

  // --- Rebel (head: angular) ---
  'Rebel/Activist':  pa('angular', 'deep-set', 'broad', 'line-wide', 'braids', 'none', 'hoodie', 'angular', null, null, 'angry-vein', ['megaphone', 'raised-fist'], ['tattoo']),
  'Rebel/Gambler':   pa('angular', 'narrow', 'subtle', 'smirk', 'slicked', 'stubble', 'leather-jacket', 'asymmetric', null, null, 'wink', ['dice', 'poker-chip'], ['ear-piercings']),
  'Rebel/Maverick':  pa('angular', 'narrow', 'prominent', 'smirk', 'mohawk', 'heavy', 'leather-jacket', 'asymmetric', null, null, 'raised-brow', ['wrench', 'motorcycle-key'], ['ear-piercings']),
  'Rebel/Reformer':  pa('angular', 'deep-set', 'broad', 'line-stern', 'undercut', 'heavy', 'hoodie', 'angular', null, null, 'furrowed-brows', ['hammer', 'blueprint-torn'], ['scar']),

  // --- Sage (head: oval) ---
  'Sage/Detective':   pa('oval', 'narrow', 'aquiline', 'line-neutral', 'bald-sides', 'none', 'blazer-tie', 'thin-arched', 'round-wire', null, 'squint-joy', ['magnifying-glass', 'notebook'], []),
  'Sage/Mentor':      pa('oval', 'deep-set', 'prominent', 'smile', 'wild-einstein', 'bushy-white', 'tweed-patches', 'bushy-wild', 'half-rim', null, null, ['book-open', 'chalk'], []),
  'Sage/Shaman':      pa('oval', 'almond', 'narrow', 'small', 'long-flowing', 'none', 'robes', 'thin-arched', 'pince-nez', null, 'dazed-spirals', ['crystal-ball', 'feathers'], ['pendant-amulet']),
  'Sage/Translator':  pa('oval', 'standard', 'subtle', 'smile', 'cropped-fringe', 'none', 'blazer-tie', 'soft-rounded', 'round-wire', null, null, ['scroll', 'rosetta-stone'], []),

  // --- Sovereign (head: strong-sym) ---
  'Sovereign/Ambassador': pa('strong-sym', 'almond', 'aquiline', 'smile', 'slicked', 'none', 'diplomatic', 'soft-rounded', null, null, null, ['olive-branch', 'treaty'], []),
  'Sovereign/Judge':      pa('strong-sym', 'deep-set', 'prominent', 'line-stern', 'slicked', 'none', 'diplomatic', 'thick-straight', 'thick-rect', null, 'furrowed-brows', ['gavel', 'scales'], []),
  'Sovereign/Patriarch':  pa('strong-sym', 'deep-set', 'aquiline', 'line-stern', 'slicked', 'handlebar', 'formal-sash', 'thick-straight', null, null, 'furrowed-brows', ['scepter', 'family-crest'], ['epaulettes']),
  'Sovereign/Ruler':      pa('strong-sym', 'narrow', 'prominent', 'line-neutral', 'slicked', 'handlebar', 'formal-sash', 'angular', 'monocle', 'crown', null, ['crown', 'orb-of-state'], ['epaulettes']),
};

export const ARCHETYPE_INDEX: readonly string[] = Object.keys(ARCHETYPE_CONFIGS).sort();

export const HEAD_FACE_SPECS: Record<string, HeadFaceSpec> = {
  'oval':       { yOffset: 0,  eyeY: 68, eyeLeftX: 82,  eyeRightX: 104, noseY: 80, mouthY: 96, beardDy: 0 },
  'soft-oval':  { yOffset: 2,  eyeY: 66, eyeLeftX: 82,  eyeRightX: 106, noseY: 80, mouthY: 90, beardDy: 2 },
  'weathered':  { yOffset: 4,  eyeY: 68, eyeLeftX: 82,  eyeRightX: 106, noseY: 82, mouthY: 92, beardDy: 12 },
  'square-jaw': { yOffset: 6,  eyeY: 68, eyeLeftX: 78,  eyeRightX: 106, noseY: 80, mouthY: 94, beardDy: 4 },
  'standard':   { yOffset: 6,  eyeY: 68, eyeLeftX: 82,  eyeRightX: 106, noseY: 84, mouthY: 94, beardDy: 6 },
  'strong-sym': { yOffset: 6,  eyeY: 66, eyeLeftX: 80,  eyeRightX: 106, noseY: 82, mouthY: 94, beardDy: 2 },
  'diamond':    { yOffset: 6,  eyeY: 72, eyeLeftX: 80,  eyeRightX: 106, noseY: 86, mouthY: 98, beardDy: 8 },
  'fallback':   { yOffset: 6,  eyeY: 68, eyeLeftX: 82,  eyeRightX: 106, noseY: 84, mouthY: 94, beardDy: 6 },
  'angular':    { yOffset: 8,  eyeY: 68, eyeLeftX: 80,  eyeRightX: 106, noseY: 80, mouthY: 96, beardDy: 8 },
  'round':      { yOffset: 8,  eyeY: 68, eyeLeftX: 80,  eyeRightX: 106, noseY: 78, mouthY: 92, beardDy: -2 },
  'heart':      { yOffset: 8,  eyeY: 70, eyeLeftX: 82,  eyeRightX: 106, noseY: 86, mouthY: 96, beardDy: 4 },
  'round-wide': { yOffset: 12, eyeY: 68, eyeLeftX: 74,  eyeRightX: 110, noseY: 80, mouthY: 90, beardDy: 0 },
};

export const CANONICAL_FACE: HeadFaceSpec = HEAD_FACE_SPECS['oval']!;

export const PART_DELTAS: Record<string, PartPositionDelta> = {
  'hair:pixie':          { dy: -1 },
  'hair:cropped-fringe': { dy: 2 },
  'hat:beret':           { dy: 2 },
  'beard:goatee':        { dy: 6 },
  'nose:button':         { dy: -2 },
  'nose:aquiline':       { dy: 2 },
  'mouth:lips-full':     { dy: 2 },
  'eyes:deep-set':       { dy: -2 },
};
