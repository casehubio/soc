export {
  ARCHETYPE_FAMILIES,
  AVATAR_SIZES,
  DETAIL_TIERS,
  DetailLevel,
} from './types.js';

export type {
  ArchetypeFamily,
  AvatarCollection,
  PartsCollection,
  FixedCollection,
  AvatarModifiers,
  AvatarPayload,
  AvatarSize,
  AxisExpression,
  FamilyPalette,
  PartAssignment,
  HeadFaceSpec,
  PartModifiers,
} from './types.js';

export { isFixedCollection } from './types.js';

export { FAMILY_PALETTES } from './palettes.js';
export { ARCHETYPE_CONFIGS, ARCHETYPE_INDEX, HEAD_FACE_SPECS, CANONICAL_FACE } from './config-table.js';
export { encodePreset, encodeCustom, decodeCode } from './code.js';
export type { DecodedAvatar } from './code.js';
export { buildAvatar } from './builder.js';
export { registerCollection, getCollection, listCollections } from './collections/registry.js';
export { resolveModifiers } from './modifiers.js';
export type { ModifierInput } from './modifiers.js';
export { AgentAvatar } from './agent-avatar.js';
export type { AgentAvatarProps } from './agent-avatar.js';
export { mythicCollection } from './collections/mythic/index.js';
export { chibiCollection } from './collections/chibi/index.js';
export { simpsonsCollection } from './collections/simpsons/index.js';
export { neonCollection } from './collections/neon/index.js';
