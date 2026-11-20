export interface Precedent {
  readonly caseId: string;
  readonly similarity: number;
  readonly outcome: string;
  readonly resolutionTime: string;
  readonly [key: string]: unknown;
}
