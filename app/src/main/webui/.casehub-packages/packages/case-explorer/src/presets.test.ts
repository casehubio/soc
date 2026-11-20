import { describe, it, expect } from 'vitest';
import { caseInstanceType, caseDefinitionType, workerType, gateType, channelType } from './presets.js';

describe('presets', () => {
  it('caseInstanceType returns valid registration with default columns', () => {
    const reg = caseInstanceType({ listEndpoint: '/api/cases' });
    expect(reg.type).toBe('case-instance');
    expect(reg.label).toBe('Cases');
    expect(reg.listEndpoint).toBe('/api/cases');
    expect(reg.columnConfig.length).toBe(3);
    expect(reg.detailEndpoint('c1')).toBe('/api/cases/c1');
  });

  it('caseInstanceType declares relationships to workers and sub-cases', () => {
    const reg = caseInstanceType({ listEndpoint: '/api/cases' });
    expect(reg.relationships).toBeTruthy();
    expect(reg.relationships!.length).toBe(2);
    expect(reg.relationships![0]!.childType).toBe('worker');
    expect(reg.relationships![1]!.childType).toBe('case-instance');
  });

  it('caseInstanceType declares treeEndpoint', () => {
    const reg = caseInstanceType({ listEndpoint: '/api/cases' });
    expect(reg.treeEndpoint).toBeTruthy();
    expect(reg.treeEndpoint!('c1')).toBe('/api/cases/c1/tree');
  });

  it('caseDefinitionType returns valid registration', () => {
    const reg = caseDefinitionType({ listEndpoint: '/api/definitions' });
    expect(reg.type).toBe('case-definition');
    expect(reg.label).toBe('Definitions');
    expect(reg.columnConfig.length).toBe(2);
  });

  it('workerType declares subTypes for compound routing', () => {
    const reg = workerType({ listEndpoint: '/api/workers' });
    expect(reg.type).toBe('worker');
    expect(reg.subTypes).toBeTruthy();
    expect(reg.subTypes).toContain('worker:flow');
    expect(reg.subTypes).toContain('worker:agent');
    expect(reg.subTypes).toContain('worker:human');
  });

  it('workerType declares eventTopics for all sub-types', () => {
    const reg = workerType({ listEndpoint: '/api/workers' });
    expect(reg.eventTopics).toBeTruthy();
    expect(reg.eventTopics!.length).toBe(3);
  });

  it('gateType returns valid registration', () => {
    const reg = gateType({ listEndpoint: '/api/gates' });
    expect(reg.type).toBe('gate');
    expect(reg.detailEndpoint('g1')).toBe('/api/gates/g1');
  });

  it('channelType returns valid registration', () => {
    const reg = channelType({ listEndpoint: '/api/channels' });
    expect(reg.type).toBe('channel');
    expect(reg.detailEndpoint('ch1')).toBe('/api/channels/ch1');
  });

  it('presets can be spread and overridden', () => {
    const customWorker = {
      ...workerType({ listEndpoint: '/api/workers' }),
      label: 'My Workers',
      columnConfig: [{ id: 'custom' as any, label: 'Custom' }],
    };
    expect(customWorker.type).toBe('worker');
    expect(customWorker.label).toBe('My Workers');
    expect(customWorker.columnConfig.length).toBe(1);
    expect(customWorker.subTypes).toContain('worker:flow');
  });
});
