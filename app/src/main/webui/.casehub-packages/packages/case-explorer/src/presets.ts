import { columnId } from '@casehubio/pages-data';
import type { EntityTypeRegistration } from './types.js';

export function caseInstanceType(config: { listEndpoint: string }): EntityTypeRegistration {
  return {
    type: 'case-instance',
    label: 'Cases',
    listEndpoint: config.listEndpoint,
    detailEndpoint: (id) => `${config.listEndpoint}/${id}`,
    columnConfig: [
      { id: columnId('summary'), label: 'Name' },
      { id: columnId('status'), label: 'Status' },
      { id: columnId('createdAt'), label: 'Started' },
    ],
    relationships: [
      { childType: 'worker', label: 'Workers', endpointTemplate: `${config.listEndpoint}/{parentId}/workers` },
      { childType: 'case-instance', label: 'Sub-cases', endpointTemplate: `${config.listEndpoint}/{parentId}/sub-cases` },
    ],
    treeEndpoint: (rootId) => `${config.listEndpoint}/${rootId}/tree`,
    eventTopics: ['case-instance'],
  };
}

export function caseDefinitionType(config: { listEndpoint: string }): EntityTypeRegistration {
  return {
    type: 'case-definition',
    label: 'Definitions',
    listEndpoint: config.listEndpoint,
    detailEndpoint: (id) => `${config.listEndpoint}/${id}`,
    columnConfig: [
      { id: columnId('summary'), label: 'Name' },
      { id: columnId('status'), label: 'Version' },
    ],
    eventTopics: ['case-definition'],
  };
}

export function workerType(config: { listEndpoint: string }): EntityTypeRegistration {
  return {
    type: 'worker',
    label: 'Workers',
    listEndpoint: config.listEndpoint,
    detailEndpoint: (id) => `${config.listEndpoint}/${id}`,
    columnConfig: [
      { id: columnId('summary'), label: 'Name' },
      { id: columnId('type'), label: 'Type' },
      { id: columnId('status'), label: 'Status' },
    ],
    subTypes: ['worker:flow', 'worker:agent', 'worker:human'],
    eventTopics: ['worker:flow', 'worker:agent', 'worker:human'],
  };
}

export function gateType(config: { listEndpoint: string }): EntityTypeRegistration {
  return {
    type: 'gate',
    label: 'Gates',
    listEndpoint: config.listEndpoint,
    detailEndpoint: (id) => `${config.listEndpoint}/${id}`,
    columnConfig: [
      { id: columnId('summary'), label: 'Gate' },
      { id: columnId('status'), label: 'Status' },
    ],
    eventTopics: ['gate'],
  };
}

export function channelType(config: { listEndpoint: string }): EntityTypeRegistration {
  return {
    type: 'channel',
    label: 'Channels',
    listEndpoint: config.listEndpoint,
    detailEndpoint: (id) => `${config.listEndpoint}/${id}`,
    columnConfig: [
      { id: columnId('summary'), label: 'Channel' },
      { id: columnId('status'), label: 'Status' },
    ],
    eventTopics: ['channel'],
  };
}
