export type AriaRole =
  | 'alert' | 'alertdialog' | 'application' | 'article'
  | 'button' | 'checkbox' | 'combobox' | 'columnheader'
  | 'form' | 'grid' | 'gridcell' | 'group'
  | 'heading' | 'img'
  | 'link' | 'list' | 'listbox' | 'listitem' | 'log'
  | 'meter'
  | 'navigation'
  | 'option'
  | 'region' | 'row' | 'rowgroup'
  | 'separator' | 'status'
  | 'tab' | 'tablist' | 'tabpanel'
  | 'textbox' | 'toolbar'
  | 'tree' | 'treeitem';

export interface AriaInteractive {
  role: AriaRole;
  ariaLabel: string;
  ariaBusy?: boolean;
  ariaDisabled?: boolean;
  ariaExpanded?: boolean;
}

export interface AriaTarget {
  role: string;
  name?: string;
  index?: string;
  within?: AriaTarget;
}

export interface AriaState {
  busy?: boolean;
  disabled?: boolean;
  expanded?: boolean;
  selected?: boolean;
  checked?: boolean | 'mixed';
  hidden?: boolean;
}
