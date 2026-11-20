import type { PartAssignment } from './types.js';
import { ARCHETYPE_CONFIGS, ARCHETYPE_INDEX } from './config-table.js';

const HEADS = [
  'angular', 'diamond', 'heart', 'oval', 'round', 'round-wide',
  'soft-oval', 'square-jaw', 'standard', 'strong-sym', 'weathered',
] as const;

const HAIRS = [
  'afro-short', 'bald-sides', 'braids', 'buzz', 'cropped-fringe',
  'long-flowing', 'messy-bun', 'mohawk', 'pixie', 'ponytail',
  'shoulder-wavy', 'slicked', 'undercut', 'wild-einstein', 'windswept',
] as const;

const FACIAL_HAIRS = [
  'none', 'bushy-white', 'full-round', 'goatee', 'handlebar',
  'heavy', 'rugged', 'stubble',
] as const;

const COSTUMES = [
  'armour', 'blazer-tie', 'business', 'diplomatic', 'explorer-jacket',
  'formal-sash', 'hoodie', 'lab-coat', 'leather-jacket', 'performer',
  'plain-shirt', 'polo', 'robes', 'romantic', 'simple-dress',
  'smock', 'soft-wrap', 'tweed-patches', 'utility-vest', 'vest-cross',
] as const;

const EYEBROWS = [
  'angular', 'asymmetric', 'bushy-wild', 'concerned', 'raised',
  'soft-rounded', 'thick-straight', 'thin-arched',
] as const;

const GLASSES = [
  'aviator', 'cat-eye', 'goggles', 'half-rim', 'monocle',
  'pince-nez', 'round-wire', 'thick-rect',
] as const;

const HATS = [
  'baseball-cap', 'beret', 'crown', 'explorer', 'flower-crown', 'jester',
] as const;

const EYES = [
  'almond', 'deep-set', 'large', 'narrow', 'round', 'standard',
] as const;

const NOSES = [
  'aquiline', 'broad', 'button', 'narrow', 'prominent', 'subtle',
] as const;

const MOUTHS = [
  'line-neutral', 'line-stern', 'line-wide', 'lips-full', 'lips-natural',
  'small', 'smile', 'smirk',
] as const;

const EXPRESSIONS = [
  'angry-vein', 'dazed-spirals', 'flat-brows', 'furrowed-brows',
  'heart-eyes', 'idea-spark', 'raised-brow', 'rosy-cheeks',
  'sparkle-eyes', 'squint-joy', 'starry-eyes', 'sweat-drop', 'wink',
] as const;

// Bit layout (40 bits total, packed into 7 base64url chars = 42 bits):
//   head:       4 bits (0-10, 11 values)
//   eyes:       3 bits (0-5,  6 values)
//   nose:       3 bits (0-5,  6 values)
//   mouth:      3 bits (0-7,  8 values)
//   hair:       4 bits (0-14, 15 values)
//   facialHair: 3 bits (0-7,  8 values)
//   costume:    5 bits (0-19, 20 values)
//   eyebrows:   3 bits (0-7,  8 values)
//   glasses:    4 bits (0-8,  8 values + null=0, shifted by 1)
//   hat:        3 bits (0-6,  6 values + null=0, shifted by 1)
//   expression: 4 bits (0-13, 13 values + null=0, shifted by 1)
//   padding:    1 bit

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function indexOf<T>(arr: readonly T[], val: T): number {
  const i = arr.indexOf(val);
  if (i === -1) throw new Error(`Unknown value: ${String(val)}`);
  return i;
}

function packBits(assignment: PartAssignment): bigint {
  let bits = 0n;
  bits = (bits << 4n) | BigInt(indexOf(HEADS, assignment.head));
  bits = (bits << 3n) | BigInt(indexOf(EYES, assignment.eyes));
  bits = (bits << 3n) | BigInt(indexOf(NOSES, assignment.nose));
  bits = (bits << 3n) | BigInt(indexOf(MOUTHS, assignment.mouth));
  bits = (bits << 4n) | BigInt(indexOf(HAIRS, assignment.hair));
  bits = (bits << 3n) | BigInt(indexOf(FACIAL_HAIRS, assignment.facialHair));
  bits = (bits << 5n) | BigInt(indexOf(COSTUMES, assignment.costume));
  bits = (bits << 3n) | BigInt(indexOf(EYEBROWS, assignment.eyebrows));
  bits = (bits << 4n) | BigInt(assignment.glasses ? indexOf(GLASSES, assignment.glasses) + 1 : 0);
  bits = (bits << 3n) | BigInt(assignment.hat ? indexOf(HATS, assignment.hat) + 1 : 0);
  bits = (bits << 4n) | BigInt(assignment.expression ? indexOf(EXPRESSIONS, assignment.expression) + 1 : 0);
  bits = bits << 1n;
  return bits;
}

function unpackBits(bits: bigint): Omit<PartAssignment, 'props' | 'accessories'> {
  bits >>= 1n;
  const expression = Number(bits & 0xFn); bits >>= 4n;
  const hat = Number(bits & 0x7n); bits >>= 3n;
  const glasses = Number(bits & 0xFn); bits >>= 4n;
  const eyebrows = Number(bits & 0x7n); bits >>= 3n;
  const costume = Number(bits & 0x1Fn); bits >>= 5n;
  const facialHair = Number(bits & 0x7n); bits >>= 3n;
  const hair = Number(bits & 0xFn); bits >>= 4n;
  const mouth = Number(bits & 0x7n); bits >>= 3n;
  const nose = Number(bits & 0x7n); bits >>= 3n;
  const eyes = Number(bits & 0x7n); bits >>= 3n;
  const head = Number(bits & 0xFn);

  return {
    head: HEADS[head]!,
    eyes: EYES[eyes]!,
    nose: NOSES[nose]!,
    mouth: MOUTHS[mouth]!,
    hair: HAIRS[hair]!,
    facialHair: FACIAL_HAIRS[facialHair]!,
    costume: COSTUMES[costume]!,
    eyebrows: EYEBROWS[eyebrows]!,
    glasses: glasses === 0 ? null : GLASSES[glasses - 1]!,
    hat: hat === 0 ? null : HATS[hat - 1]!,
    expression: expression === 0 ? null : EXPRESSIONS[expression - 1]!,
  };
}

function toBase64(n: bigint, len: number): string {
  let s = '';
  for (let i = len - 1; i >= 0; i--) {
    s += B64[Number((n >> BigInt(i * 6)) & 0x3Fn)];
  }
  return s;
}

function fromBase64(s: string): bigint {
  let n = 0n;
  for (let i = 0; i < s.length; i++) {
    n = (n << 6n) | BigInt(B64.indexOf(s[i]!));
  }
  return n;
}

export function encodePreset(archetypeKey: string, collection = 'mythic'): string {
  const idx = ARCHETYPE_INDEX.indexOf(archetypeKey);
  if (idx === -1) throw new Error(`Unknown archetype: ${archetypeKey}`);
  return `${collection}:P${idx.toString(36)}`;
}

export function encodeCustom(assignment: PartAssignment, collection = 'mythic'): string {
  const bits = packBits(assignment);
  return `${collection}:C${toBase64(bits, 7)}`;
}

export interface DecodedAvatar {
  readonly collection: string;
  readonly type: 'preset' | 'custom';
  readonly archetypeKey?: string;
  readonly assignment: PartAssignment;
}

export function decodeCode(code: string): DecodedAvatar {
  const colonIdx = code.indexOf(':');
  if (colonIdx === -1) throw new Error(`Invalid code: ${code}`);
  const collection = code.slice(0, colonIdx);
  const payload = code.slice(colonIdx + 1);

  if (payload.startsWith('P')) {
    const idx = parseInt(payload.slice(1), 36);
    const key = ARCHETYPE_INDEX[idx];
    if (key === undefined) throw new Error(`Invalid preset index: ${idx}`);
    return {
      collection,
      type: 'preset',
      archetypeKey: key,
      assignment: ARCHETYPE_CONFIGS[key]!,
    };
  }

  if (payload.startsWith('C')) {
    const bits = fromBase64(payload.slice(1));
    const core = unpackBits(bits);
    return {
      collection,
      type: 'custom',
      assignment: { ...core, props: [], accessories: [] },
    };
  }

  throw new Error(`Invalid code type: ${payload[0]}`);
}
