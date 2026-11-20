export interface OrcNumericPrimitive {
  doubleValue(): number;
  onThresholdChange(listener: (value: number) => void): void;
  removeThresholdListener(listener: (value: number) => void): void;
}
