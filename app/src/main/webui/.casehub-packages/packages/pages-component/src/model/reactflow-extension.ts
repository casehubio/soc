export interface CasehubReactFlowExtension {
  readonly panOnDrag?: boolean;
  readonly zoomOnScroll?: boolean;
  readonly zoomOnPinch?: boolean;
  readonly snapToGrid?: boolean;
  readonly snapGrid?: readonly [number, number];
  readonly colorMode?: "light" | "dark" | "system";
  readonly defaultMarkerColor?: string;
  readonly selectionMode?: "full" | "partial";
  readonly elementsSelectable?: boolean;
}
