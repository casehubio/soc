import { css } from 'lit';

export const roundDividerStyles = css`
  .round-divider {
    margin: 16px 0 8px;
    padding: 4px 10px;
    border-bottom: 1px solid var(--pages-neutral-5, #d4d4d4);
    color: var(--pages-neutral-8, #9ca3af);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .round-divider:first-child { margin-top: 0; }
`;
