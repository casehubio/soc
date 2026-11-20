import type { ArchetypeFamily, FamilyPalette } from './types.js';

export const FAMILY_PALETTES: Record<ArchetypeFamily, FamilyPalette> = {
  Caregiver: { primary: '#2e5940', secondary: '#3d7a55', accent: '#e8e4dc', skin: '#d4a574', hairColor: '#4a3728', iris: '#2e5940', irisDark: '#1e4030' },
  Creator:   { primary: '#c0392b', secondary: '#e67e22', accent: '#f1c40f', skin: '#d4a574', hairColor: '#3a2a1a', iris: '#c0392b', irisDark: '#9a2a20' },
  Everyman:  { primary: '#5a5a5a', secondary: '#7a7a7a', accent: '#d4c4a8', skin: '#c8a882', hairColor: '#3a2a1a', iris: '#5a5a5a', irisDark: '#3a3a3a' },
  Explorer:  { primary: '#5a4a35', secondary: '#6a5a45', accent: '#c0392b', skin: '#b8915a', hairColor: '#3a2a1a', iris: '#5a4a35', irisDark: '#3a3025' },
  Hero:      { primary: '#8b1a1a', secondary: '#c0c0c0', accent: '#ffd700', skin: '#c8a882', hairColor: '#2a1a0a', iris: '#8b1a1a', irisDark: '#6a1515' },
  Innocent:  { primary: '#f0e6d8', secondary: '#ddd4c4', accent: '#f4d03f', skin: '#e8c8a0', hairColor: '#c4a060', iris: '#8a7a60', irisDark: '#6a5a40' },
  Jester:    { primary: '#e67e22', secondary: '#9b59b6', accent: '#2ecc71', skin: '#d4a574', hairColor: '#c0392b', iris: '#e67e22', irisDark: '#c06020' },
  Lover:     { primary: '#8b2252', secondary: '#c0546a', accent: '#ffd700', skin: '#d4a574', hairColor: '#2a1a0a', iris: '#8b2252', irisDark: '#6a1a40' },
  Magician:  { primary: '#2d1b4e', secondary: '#5b3a8c', accent: '#d4a0ff', skin: '#b0a080', hairColor: '#1a1a2a', iris: '#5b3a8c', irisDark: '#3a2570' },
  Rebel:     { primary: '#1a1a1a', secondary: '#333333', accent: '#cc0000', skin: '#c8a882', hairColor: '#1a1a1a', iris: '#444444', irisDark: '#2a2a2a' },
  Sage:      { primary: '#2c3e6b', secondary: '#4a6fa5', accent: '#e8e4dc', skin: '#c8a882', hairColor: '#8a8a8a', iris: '#4a6fa5', irisDark: '#3a5a85' },
  Sovereign: { primary: '#1a2744', secondary: '#c9a227', accent: '#8b0000', skin: '#c8a882', hairColor: '#2a2a2a', iris: '#1a2744', irisDark: '#0f1a30' },
};
