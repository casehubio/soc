export enum Priority {
  BACKGROUND = 0,
  NORMAL = 1,
  HIGH = 2,
}

export function parsePriority(raw: string): Priority {
  switch (raw.toLowerCase()) {
    case 'background': return Priority.BACKGROUND;
    case 'normal': return Priority.NORMAL;
    case 'high': return Priority.HIGH;
    default: throw new Error(`Unknown priority: '${raw}'`);
  }
}
