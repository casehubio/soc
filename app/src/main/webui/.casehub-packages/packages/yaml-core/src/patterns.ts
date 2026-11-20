export type PlaybookPatternType =
  | 'sequence' | 'parallel' | 'conditional'
  | 'match' | 'loop' | 'try-catch';

export interface PlaybookPatternCategory {
  category: 'playbook';
  type: PlaybookPatternType;
  name?: string;
  description?: string;
}
