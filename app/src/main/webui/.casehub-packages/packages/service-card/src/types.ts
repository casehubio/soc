export interface ClusterDeploymentStatus {
  readonly clusterId: string;
  readonly clusterName: string;
  readonly status: 'converged' | 'provisioning' | 'faulted' | 'unknown';
  readonly readyReplicas: number;
  readonly desiredReplicas: number;
}

export interface ServiceCardData {
  readonly serviceName: string;
  readonly serviceId: string;
  readonly image: string;
  readonly replicas: number;
  readonly status: string;
  readonly clusters: ClusterDeploymentStatus[];
}
