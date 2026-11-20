import { css } from 'lit';

export const selectedHighlightStyles = css`
  .selected {
    outline: 2px solid var(--pages-accent-9, #6366f1);
    outline-offset: -2px;
    background: rgba(99, 102, 241, 0.08);
  }
`;
