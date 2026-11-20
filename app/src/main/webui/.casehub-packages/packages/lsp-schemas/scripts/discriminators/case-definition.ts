export interface DiscriminatorRule {
  strategy: 'key-presence';
  discriminatorKeys: string[];
}

export const discriminators: Record<string, DiscriminatorRule> = {
  Binding: {
    strategy: 'key-presence',
    discriminatorKeys: ['capability', 'subCase', 'humanTask'],
  },
  Trigger: {
    strategy: 'key-presence',
    discriminatorKeys: ['contextChange', 'cloudEvent', 'schedule', 'scopeActivated'],
  },
};
