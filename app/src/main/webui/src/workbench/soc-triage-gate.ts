export interface OutcomeDefinition {
  key: string;
  label: string;
  variant: "success" | "danger" | "neutral";
}

export const SOC_TRIAGE_OUTCOMES: OutcomeDefinition[] = [
  { key: "CONFIRM_SEVERITY", label: "Confirm Severity", variant: "success" },
  { key: "DOWNGRADE", label: "Downgrade", variant: "neutral" },
  { key: "ESCALATE", label: "Escalate", variant: "neutral" },
  { key: "FALSE_POSITIVE", label: "False Positive", variant: "danger" },
];

export async function completeWorkItem(
  workItemId: string,
  outcome: string,
  actorId: string,
): Promise<void> {
  const response = await fetch(`/workitems/${workItemId}/complete`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ outcome, actorId }),
  });
  if (!response.ok) throw new Error(`Complete failed: HTTP ${response.status}`);
}

export function wireTriageGate(
  gateElement: HTMLElement & {
    outcomes?: OutcomeDefinition[];
    prompt?: string;
    deadline?: string;
  },
  workItemId: string,
  deadline: string | null,
  actorId: string,
): void {
  gateElement.outcomes = SOC_TRIAGE_OUTCOMES;
  gateElement.prompt =
    "Review incident findings and containment recommendation";
  if (deadline) gateElement.deadline = deadline;

  gateElement.addEventListener("pages-event", async (e: Event) => {
    const detail = (e as CustomEvent).detail;
    if (detail?.topic === "gate.decided") {
      await completeWorkItem(workItemId, detail.payload.outcome, actorId);
    }
  });
}
