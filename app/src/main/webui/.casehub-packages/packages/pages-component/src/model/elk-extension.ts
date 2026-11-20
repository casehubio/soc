export interface CasehubElkExtension {
  readonly wrapping?: boolean;
  readonly headerHeight?: number;
  readonly elkOptions?: Readonly<Record<string, string>>;
}
