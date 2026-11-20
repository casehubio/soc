export interface GroupStyleConfig {
  readonly label?: string;
  readonly className?: string;
  readonly icon?: string;
}

export const GroupedDataViewTopics = {
  GROUP_TOGGLE: 'grouped-data.group-toggle',
  ROW_ACTIVATED: 'grouped-data.row-activated',
} as const;
