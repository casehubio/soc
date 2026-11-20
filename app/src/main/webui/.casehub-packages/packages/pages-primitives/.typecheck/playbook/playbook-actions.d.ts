export declare const PLAYBOOK_ACTIONS: unique symbol;
export interface PlaybookMethodDescriptor {
    params?: Record<string, string | {
        type: string;
        required?: boolean;
    }>;
    returns?: string;
    description?: string;
    portability?: 'universal' | 'java' | 'ts' | 'both';
}
export type PlaybookCapability = Record<string, PlaybookMethodDescriptor>;
//# sourceMappingURL=playbook-actions.d.ts.map