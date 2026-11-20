import type { MenuItem } from '@casehubio/pages-primitives';
import type { TreeNodeType } from './builder-tree.js';

export function computeMenuItems(nodeType: TreeNodeType, isContainer: boolean): MenuItem[] {
  switch (nodeType) {
    case 'component':
      return [
        ...(isContainer ? [{ label: 'Add child', action: 'add-child' }] : []),
        { label: 'Move up', action: 'move-up' },
        { label: 'Move down', action: 'move-down' },
        { separator: true, label: '' },
        { label: 'Wrap in…', children: [
          { label: 'Row', action: 'wrap-row' },
          { label: 'Column', action: 'wrap-column' },
          { separator: true, label: '' },
          { label: 'Tabs', action: 'wrap-tabs' },
        ]},
        { label: 'Replace with…', action: 'replace-with' },
        { separator: true, label: '' },
        { label: 'Duplicate', action: 'duplicate', shortcut: '⌃D' },
        { label: 'Delete', action: 'delete', shortcut: '⌫' },
      ];
    case 'row':
      return [
        { label: 'Move up', action: 'move-up' },
        { label: 'Move down', action: 'move-down' },
        { separator: true, label: '' },
        { label: 'Add column', action: 'add-column' },
        { separator: true, label: '' },
        { label: 'Delete', action: 'delete', shortcut: '⌫' },
      ];
    case 'column':
      return [
        { label: 'Move left', action: 'move-up' },
        { label: 'Move right', action: 'move-down' },
        { separator: true, label: '' },
        { label: 'Add component', action: 'add-child' },
        { separator: true, label: '' },
        { label: 'Delete', action: 'delete', shortcut: '⌫' },
      ];
    case 'page':
      return [
        { label: 'Add row', action: 'add-row' },
        { label: 'Add component', action: 'add-child' },
        { separator: true, label: '' },
        { label: 'Delete', action: 'delete', shortcut: '⌫' },
      ];
    case 'dataset':
      return [
        { label: 'Duplicate', action: 'duplicate', shortcut: '⌃D' },
        { label: 'Delete', action: 'delete', shortcut: '⌫' },
      ];
    default:
      return [];
  }
}
