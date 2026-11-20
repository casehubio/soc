import { css } from 'lit';

export const pulseAnimation = css`
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
  @media (prefers-reduced-motion: reduce) {
    .pulse { animation: none; }
  }
`;
