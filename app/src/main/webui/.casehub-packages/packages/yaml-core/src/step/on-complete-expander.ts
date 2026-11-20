export class SourceLocationMap {
  private readonly generatedToOriginal = new Map<string, string>();

  record(generatedName: string, parentContext: string): void {
    this.generatedToOriginal.set(generatedName, parentContext);
  }

  isGenerated(name: string): boolean {
    return this.generatedToOriginal.has(name);
  }

  originalContext(generatedName: string): string | undefined {
    return this.generatedToOriginal.get(generatedName);
  }
}

export interface ExpandedSteps {
  steps: Record<string, unknown>[];
  locations: SourceLocationMap;
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class OnCompleteExpander {
  static expand(steps: Record<string, unknown>[]): ExpandedSteps {
    let counter = 0;
    const locations = new SourceLocationMap();
    const result: Record<string, unknown>[] = [];

    function expandRecursive(input: Record<string, unknown>[], output: Record<string, unknown>[]): void {
      for (const step of input) {
        const onComplete = step['on-complete'];
        if (onComplete == null) { output.push(step); continue; }

        const expanded = { ...step };
        delete expanded['on-complete'];

        counter++;
        let name: string;
        if (expanded['name'] != null) {
          name = String(expanded['name']);
        } else {
          name = `__oc_${counter}`;
          expanded['name'] = name;
          locations.record(name, `on-complete block #${counter}`);
        }

        const signalName = `${name}_done`;
        const existingSignal = expanded['signal'];
        if (existingSignal != null) {
          const signals: string[] = [];
          if (Array.isArray(existingSignal)) {
            existingSignal.forEach(s => signals.push(String(s)));
          } else {
            signals.push(String(existingSignal));
          }
          signals.push(signalName);
          expanded['signal'] = signals;
        } else {
          expanded['signal'] = signalName;
        }

        output.push(expanded);

        const continuations = onComplete as Record<string, unknown>[];
        const continuationSteps: Record<string, unknown>[] = [];
        for (const cont of continuations) {
          continuationSteps.push({ ...cont, wait: signalName });
        }

        expandRecursive(continuationSteps, output);
      }
    }

    expandRecursive(steps, result);
    return { steps: result, locations };
  }
}
