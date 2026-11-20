import { css } from 'lit';

export const badgeStyles = css`
  .badge {
    display: inline-block;
    padding: 1px 6px;
    border-radius: 2px;
    font-size: 9px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .badge-priority { background: var(--pages-neutral-3, #e5e5e5); color: var(--pages-neutral-8, #9ca3af); }
  .badge-priority-high { background: var(--pages-error-2, #fee2e2); color: var(--pages-error-9, #dc2626); }
  .badge-priority-medium { background: var(--pages-warning-2, #fef3c7); color: var(--pages-warning-9, #d97706); }
  .badge-scope { background: var(--pages-accent-2, #e0e7ff); color: var(--pages-accent-9, #6366f1); border: 1px solid var(--pages-accent-9, #6366f1); }
  .badge-location {
    background: var(--pages-neutral-2, #f5f5f5);
    color: var(--pages-neutral-11, #333);
    border: 1px solid var(--pages-neutral-5, #d4d4d4);
    font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
  }
`;
