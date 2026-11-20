import { describe, it, expectTypeOf } from 'vitest';
import type {
  EntityInstance,
  CommandDescriptor,
  EntityTypeRegistration,
  EntitySelection,
  EntityTreeNode,
  EntityListResponse,
  EntityEvent,
  GroupInfo,
  FilterDescriptor,
  NavigationState,
  BreadcrumbEntry,
  RelationshipDeclaration,
  ParameterDescriptor,
  SelectOption,
} from './types.js';

describe('types', () => {
  it('EntityInstance has required fields', () => {
    expectTypeOf<EntityInstance>().toHaveProperty('id');
    expectTypeOf<EntityInstance>().toHaveProperty('type');
    expectTypeOf<EntityInstance>().toHaveProperty('status');
    expectTypeOf<EntityInstance>().toHaveProperty('summary');
    expectTypeOf<EntityInstance>().toHaveProperty('state');
    expectTypeOf<EntityInstance>().toHaveProperty('availableCommands');
    expectTypeOf<EntityInstance>().toHaveProperty('createdAt');
    expectTypeOf<EntityInstance['availableCommands']>().toEqualTypeOf<readonly CommandDescriptor[]>();
  });

  it('CommandDescriptor has MCP-tools-style fields', () => {
    expectTypeOf<CommandDescriptor>().toHaveProperty('name');
    expectTypeOf<CommandDescriptor>().toHaveProperty('label');
    expectTypeOf<CommandDescriptor>().toHaveProperty('endpoint');
    expectTypeOf<CommandDescriptor['severity']>().toEqualTypeOf<'normal' | 'destructive' | undefined>();
  });

  it('ParameterDescriptor supports select options', () => {
    expectTypeOf<ParameterDescriptor>().toHaveProperty('type');
    expectTypeOf<ParameterDescriptor['options']>().toEqualTypeOf<readonly SelectOption[] | undefined>();
  });

  it('EntityTypeRegistration detailEndpoint is a function', () => {
    expectTypeOf<EntityTypeRegistration['detailEndpoint']>().toBeFunction();
    expectTypeOf<EntityTypeRegistration['detailEndpoint']>().parameter(0).toBeString();
    expectTypeOf<EntityTypeRegistration['detailEndpoint']>().returns.toBeString();
  });

  it('EntityTypeRegistration supports sub-types and event topics', () => {
    expectTypeOf<EntityTypeRegistration['subTypes']>().toEqualTypeOf<readonly string[] | undefined>();
    expectTypeOf<EntityTypeRegistration['eventTopics']>().toEqualTypeOf<readonly string[] | undefined>();
  });

  it('EntitySelection carries id and type', () => {
    expectTypeOf<EntitySelection>().toHaveProperty('id');
    expectTypeOf<EntitySelection>().toHaveProperty('type');
    const sel: EntitySelection = { id: '1', type: 'case' };
    expectTypeOf(sel.id).toBeString();
    expectTypeOf(sel.type).toBeString();
  });

  it('EntityTreeNode children are recursive', () => {
    expectTypeOf<NonNullable<EntityTreeNode['children']>>()
      .toEqualTypeOf<readonly EntityTreeNode[]>();
  });

  it('EntityTreeNode supports lazy loading', () => {
    expectTypeOf<EntityTreeNode['childrenEndpoint']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<EntityTreeNode['childCount']>().toEqualTypeOf<number | undefined>();
  });

  it('GroupInfo tracks M-of-N completion', () => {
    expectTypeOf<GroupInfo>().toHaveProperty('totalInGroup');
    expectTypeOf<GroupInfo>().toHaveProperty('requiredCount');
    expectTypeOf<GroupInfo>().toHaveProperty('completedCount');
  });

  it('EntityListResponse supports cursor pagination', () => {
    expectTypeOf<EntityListResponse>().toHaveProperty('entities');
    expectTypeOf<EntityListResponse['nextCursor']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<EntityListResponse['totalCount']>().toEqualTypeOf<number | undefined>();
  });

  it('EntityEvent carries entity type and event type', () => {
    expectTypeOf<EntityEvent>().toHaveProperty('entityType');
    expectTypeOf<EntityEvent>().toHaveProperty('entityId');
    expectTypeOf<EntityEvent>().toHaveProperty('eventType');
    expectTypeOf<EntityEvent>().toHaveProperty('timestamp');
  });

  it('FilterDescriptor supports multiple filter types', () => {
    expectTypeOf<FilterDescriptor['type']>().toEqualTypeOf<'text' | 'select' | 'date-range' | 'status'>();
  });

  it('NavigationState tracks view mode and breadcrumbs', () => {
    expectTypeOf<NavigationState['viewMode']>().toEqualTypeOf<'list' | 'tree'>();
    expectTypeOf<NavigationState['breadcrumbs']>().toEqualTypeOf<readonly BreadcrumbEntry[]>();
  });

  it('RelationshipDeclaration uses endpoint template', () => {
    expectTypeOf<RelationshipDeclaration>().toHaveProperty('childType');
    expectTypeOf<RelationshipDeclaration>().toHaveProperty('endpointTemplate');
  });
});
