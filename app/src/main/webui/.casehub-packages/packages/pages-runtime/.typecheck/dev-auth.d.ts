export interface DevAuthConfig {
    readonly backendUrl: string;
    readonly identities?: readonly string[];
}
export declare function createDevAuthTokenFn(sessionStorageKey?: string): () => string | null;
//# sourceMappingURL=dev-auth.d.ts.map