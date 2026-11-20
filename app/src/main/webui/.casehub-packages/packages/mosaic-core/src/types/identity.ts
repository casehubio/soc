export interface WorkIdentity {
  readonly userId: string;
  readonly displayName: string;
  readonly groups: readonly string[];
  readonly tenancyId?: string;
}

export type UserSearchProvider = (
  query: string,
) => Promise<
  ReadonlyArray<{ readonly id: string; readonly displayName: string; readonly type: 'user' | 'group' }>
>;
