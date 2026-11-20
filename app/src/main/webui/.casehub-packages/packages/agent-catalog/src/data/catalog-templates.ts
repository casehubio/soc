import { PROFESSION_PRESETS, PROFESSION_LIST, initProfile } from '@casehubio/mosaic-avatar-step';
import type { RoleVariant } from '@casehubio/mosaic-avatar-step';
import type { FullAgentDescriptor } from '@casehubio/mosaic-core';

export interface CatalogTemplate {
  readonly id: string;
  readonly profession: string;
  readonly role: string;
  readonly variant: RoleVariant;
  readonly preferredAlias: string;
  readonly featured?: boolean;
}

const ALIAS_BY_ROLE: Record<string, string> = {
  'Architect': 'reasoning-heavy',
  'QA Lead': 'reasoning-heavy',
  'Data Scientist': 'reasoning-heavy',
  'Analyst': 'reasoning-heavy',
  'Researcher': 'reasoning-heavy',
  'Auditor': 'reasoning-heavy',
  'Litigator': 'reasoning-heavy',
  'Compliance Officer': 'reasoning-heavy',
  'Defence Attorney': 'reasoning-heavy',
  'Contracts Specialist': 'reasoning-heavy',
  'Surgeon': 'reasoning-heavy',
  'Psychiatrist': 'reasoning-heavy',
  'Quant': 'reasoning-heavy',
  'Trader': 'fast-response',
  'Sales Development': 'fast-response',
  'Tutor': 'fast-response',
  'Nurse': 'fast-response',
  'GP': 'fast-response',
  'Customer Success': 'fast-response',
  'Community Manager': 'fast-response',
};
const DEFAULT_ALIAS = 'reasoning-heavy';

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const FEATURED_IDS = new Set([
  'software-architect-the-systems-architect',
  'legal-compliance-officer-the-standards-enforcer',
  'medical-gp-the-holistic-family-doctor',
  'finance-analyst-the-evidence-driven-analyst',
  'coaching-life-coach-the-wisdom-guide',
]);

function buildTemplates(): CatalogTemplate[] {
  const templates: CatalogTemplate[] = [];
  for (const profession of PROFESSION_LIST) {
    const roles = PROFESSION_PRESETS[profession];
    if (!roles) continue;
    for (const { role, variants } of roles) {
      for (const variant of variants) {
        const id = `${slugify(profession)}-${slugify(role)}-${slugify(variant.label)}`;
        templates.push({
          id,
          profession,
          role,
          variant,
          preferredAlias: ALIAS_BY_ROLE[role] ?? DEFAULT_ALIAS,
          featured: FEATURED_IDS.has(id) || undefined,
        });
      }
    }
  }
  return templates;
}

export const CATALOG_TEMPLATES: readonly CatalogTemplate[] = buildTemplates();
export const FEATURED_TEMPLATES: readonly CatalogTemplate[] = CATALOG_TEMPLATES.filter(t => t.featured);

export function buildDescriptor(template: CatalogTemplate): FullAgentDescriptor {
  const [family, sub] = template.variant.archetype.split('/');
  const personality = initProfile(template.variant.archetype);
  return {
    agentId: '',
    name: template.variant.label,
    tenancyId: '',
    archetypeFamily: family,
    subArchetype: sub,
    description: template.variant.description,
    personality,
    preferredAlias: template.preferredAlias,
    profession: template.profession,
    role: template.role,
  };
}
