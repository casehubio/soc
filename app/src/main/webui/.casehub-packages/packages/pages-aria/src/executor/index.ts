export { resolveTarget, click, fill, select, expand, collapse, assertState, waitFor, executeStep } from './command-executor.js';
export { showSpotlight, dismissAllSpotlights, type SpotlightConfig } from './spotlight.js';
export { EDITABLE_TEXT, findEditableText, isEditableText } from './editable-text.js';
// eslint-disable-next-line @typescript-eslint/no-deprecated -- backward-compat re-export
export type { Position, ScenarioEditableText, EditableText } from './editable-text.js';
