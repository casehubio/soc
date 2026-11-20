import { html } from 'lit-html';
import { registerStencil, registerEdgeType } from '@casehubio/graph-renderer';
import { registerPropertySchema } from '@casehubio/pages-diagram-core';
import { swfTaskSchema } from '../schemas/swf-task-schema';
import { callGrammar, renderCall } from './call.js';
import { setGrammar, renderSet } from './set.js';
import { switchGrammar, renderSwitch } from './switch.js';
import { raiseGrammar, renderRaise } from './raise.js';
import { tryGrammar, renderTry } from './try.js';
import { tryCatchGrammar, renderTryCatch, renderCatch } from './try-catch.js';
import { forGrammar, renderFor } from './for.js';
import { startGrammar, endGrammar, entryGrammar, exitGrammar, renderStart, renderEnd, renderEntry, renderExit } from './boundary.js';
import { genericGrammar, renderGeneric } from './generic.js';
import { doGrammar, renderDo } from './do.js';
import { forkGrammar, renderFork } from './fork.js';
import { emitGrammar, renderEmit } from './emit.js';
import { listenGrammar, renderListen } from './listen.js';
import { runGrammar, renderRun } from './run.js';
import { waitGrammar, renderWait } from './wait.js';

const CURSOR_OVERRIDES = `
.react-flow__pane { cursor: default !important; }
.react-flow__pane.dragging { cursor: grabbing !important; }
.react-flow__node { cursor: pointer !important; }
.react-flow__node button { cursor: pointer !important; }
`;

let registered = false;

export function registerSwfStencils(): void {
  if (registered) return;
  registered = true;

  registerStencil({ type: 'swf-call', label: 'Call', icon: 'phone', grammar: callGrammar, render: renderCall, defaultStyle: CURSOR_OVERRIDES });
  registerStencil({ type: 'swf-set', label: 'Set', icon: 'edit', grammar: setGrammar, render: renderSet });
  registerStencil({ type: 'swf-switch', label: 'Switch', icon: 'git-branch', grammar: switchGrammar, render: renderSwitch });
  registerStencil({ type: 'swf-raise', label: 'Raise', icon: 'alert-triangle', grammar: raiseGrammar, render: renderRaise });
  registerStencil({ type: 'swf-for', label: 'For', icon: 'repeat', grammar: forGrammar, render: renderFor });
  registerStencil({ type: 'swf-try', label: 'Try', icon: 'shield', grammar: tryGrammar, render: renderTry });
  registerStencil({ type: 'swf-try-catch', label: 'Try/Catch', icon: 'shield', grammar: tryCatchGrammar, render: renderTryCatch });
  registerStencil({ type: 'swf-catch', label: 'Catch', icon: 'shield-off', grammar: tryCatchGrammar, render: renderCatch });
  registerStencil({ type: 'swf-start', label: 'Start', icon: 'play', grammar: startGrammar, render: renderStart });
  registerStencil({ type: 'swf-end', label: 'End', icon: 'square', grammar: endGrammar, render: renderEnd });
  registerStencil({ type: 'swf-entry', label: 'Entry', icon: 'log-in', grammar: entryGrammar, render: renderEntry });
  registerStencil({ type: 'swf-exit', label: 'Exit', icon: 'log-out', grammar: exitGrammar, render: renderExit });
  registerStencil({ type: 'swf-do', label: 'Do', icon: 'list', grammar: doGrammar, render: renderDo });
  registerStencil({ type: 'swf-fork', label: 'Fork', icon: 'git-merge', grammar: forkGrammar, render: renderFork });
  registerStencil({ type: 'swf-emit', label: 'Emit', icon: 'send', grammar: emitGrammar, render: renderEmit });
  registerStencil({ type: 'swf-listen', label: 'Listen', icon: 'radio', grammar: listenGrammar, render: renderListen });
  registerStencil({ type: 'swf-run', label: 'Run', icon: 'terminal', grammar: runGrammar, render: renderRun });
  registerStencil({ type: 'swf-wait', label: 'Wait', icon: 'clock', grammar: waitGrammar, render: renderWait });
  registerStencil({ type: 'swf-generic', label: 'Step', icon: 'box', grammar: genericGrammar, render: renderGeneric });
  registerStencil({ type: 'swf-root', label: 'Workflow', icon: 'box', grammar: genericGrammar, render: () => html`` });

  registerEdgeType({ type: 'flow', label: 'Flow' });
  registerEdgeType({ type: 'switch-case', label: 'Case', defaultStyle: '.switch-case-edge { stroke-dasharray: 4; }' });

  const defs = (swfTaskSchema as any).$defs as Record<string, Record<string, unknown>> | undefined;
  if (defs) {
    const typeMap: Record<string, string> = {
      CallTask: 'swf-call', SetTask: 'swf-set', SwitchTask: 'swf-switch',
      RaiseTask: 'swf-raise', TryTask: 'swf-try', TryCatchTask: 'swf-try-catch',
      DoTask: 'swf-do', ForkTask: 'swf-fork',
      EmitTask: 'swf-emit', ListenTask: 'swf-listen', RunTask: 'swf-run',
      WaitTask: 'swf-wait',
    };
    for (const [defName, nodeType] of Object.entries(typeMap)) {
      if (defs[defName]) registerPropertySchema(nodeType, defs[defName]);
    }
  }
}
