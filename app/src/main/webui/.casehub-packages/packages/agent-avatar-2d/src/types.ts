export const ARCHETYPE_FAMILIES = [
  'Caregiver', 'Creator', 'Everyman', 'Explorer',
  'Hero', 'Innocent', 'Jester', 'Lover',
  'Magician', 'Rebel', 'Sage', 'Sovereign',
] as const;

export type ArchetypeFamily = typeof ARCHETYPE_FAMILIES[number];

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

export const AVATAR_SIZES: Record<AvatarSize, number> = {
  xs: 24,
  sm: 40,
  md: 64,
  lg: 128,
};

export const DetailLevel = {
  XS: 0,
  SM: 1,
  MD: 2,
  LG: 3,
} as const;

export type DetailLevel = typeof DetailLevel[keyof typeof DetailLevel];

export const DETAIL_TIERS: Record<AvatarSize, DetailLevel> = {
  xs: DetailLevel.XS,
  sm: DetailLevel.SM,
  md: DetailLevel.MD,
  lg: DetailLevel.LG,
};

export interface PartAssignment {
  readonly head: string;
  readonly eyes: string;
  readonly nose: string;
  readonly mouth: string;
  readonly hair: string;
  readonly facialHair: string;
  readonly costume: string;
  readonly eyebrows: string;
  readonly glasses: string | null;
  readonly hat: string | null;
  readonly expression: string | null;
  readonly props: readonly string[];
  readonly accessories: readonly string[];
}

export interface FamilyPalette {
  readonly primary: string;
  readonly secondary: string;
  readonly accent: string;
  readonly skin: string;
  readonly hairColor: string;
  readonly iris: string;
  readonly irisDark: string;
}

export interface AxisExpression {
  readonly term: string;
  readonly weight: number;
}

export interface PartModifiers {
  readonly scale?: number;
  readonly rotation?: number;
  readonly opacity?: number;
}

export interface AvatarModifiers {
  readonly intensity: number;
  readonly temperament: number;
  readonly energy: number;
  readonly precision: number;
  readonly organic: number;
  readonly expression: Record<string, string>;
  readonly partOverrides?: Record<string, PartModifiers>;
}

export interface AvatarPayload {
  readonly family: ArchetypeFamily;
  readonly subArchetype: string;
  readonly collection?: string;
  readonly adjectives?: readonly string[];
  readonly code?: string;
}

export interface HeadFaceSpec {
  readonly yOffset: number;
  readonly eyeY: number;
  readonly eyeLeftX: number;
  readonly eyeRightX: number;
  readonly noseY: number;
  readonly mouthY: number;
  readonly beardDy: number;
}

export interface PartPositionDelta {
  readonly dx?: number;
  readonly dy?: number;
}

interface AvatarCollectionBase {
  readonly id: string;
  readonly label: string;
}

export interface PartsCollection extends AvatarCollectionBase {
  readonly type: 'parts';
  readonly partsUrl: string;
  readonly previewUrl: string;
  readonly parts: Map<string, string>;
}

export interface FixedCollection extends AvatarCollectionBase {
  readonly type: 'fixed';
  readonly fixedSvgs: Map<string, string>;
}

export type AvatarCollection = PartsCollection | FixedCollection;

export function isFixedCollection(c: AvatarCollection): c is FixedCollection {
  return c.type === 'fixed';
}
