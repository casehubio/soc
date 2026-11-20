import { css } from 'lit';

export const entryCardStyles = css`
  .entry-card {
    padding: 8px 12px;
    border: 1px solid var(--pages-neutral-4, #d4d4d4);
    border-left-width: 3px;
    border-radius: var(--pages-radius-sm, 4px);
    background: var(--pages-neutral-1, #fafafa);
  }
  .entry-header {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: var(--pages-neutral-9, #525252);
    margin-bottom: 4px;
  }
  .entry-agent { font-weight: 600; color: var(--pages-neutral-12, #111); }
  .entry-type { text-transform: uppercase; font-size: 9px; letter-spacing: 0.3px; }
  .entry-timestamp { margin-left: auto; font-size: 10px; }
  .entry-content {
    color: var(--pages-neutral-12, #111);
    font-size: 13px;
    line-height: 1.5;
    white-space: pre-wrap;
    word-wrap: break-word;
  }
`;
