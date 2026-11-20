export interface HtnMethodYaml {
  guard?: string;
  guardLabel?: string;
  strategy?: string;
  estimatedCost?: number;
  estimatedDuration?: string;
  tasks: HtnTaskYaml[];
}

export interface HtnTaskYaml {
  name: string;
  capability?: string;
  definitionRef?: string;
  methods?: HtnMethodYaml[];
}

export interface HtnDocumentYaml {
  dsl?: string;
  namespace?: string;
  name?: string;
  spec: {
    decomposition: {
      root: HtnTaskYaml;
    };
  };
}
