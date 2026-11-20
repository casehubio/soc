export interface ClusterInfo {
  readonly id: string;
  readonly name: string;
  readonly apiUrl: string;
  readonly namespace: string;
  readonly type: 'KUBERNETES' | 'OPENSHIFT';
  readonly status: 'CONNECTED' | 'UNREACHABLE' | 'UNKNOWN';
  readonly applicationCount: number;
}

export interface ClusterRegistrationRequest {
  readonly name: string;
  readonly apiUrl: string;
  readonly namespace: string;
  readonly type: 'KUBERNETES' | 'OPENSHIFT';
}
