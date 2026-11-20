import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { execSync } from "child_process";
import { resolve } from "path";

describe("schema generator", () => {
  const generatedPath = resolve(__dirname, "component-schemas.generated.ts");

  it("generated file exists", () => {
    expect(existsSync(generatedPath)).toBe(true);
  });

  it("generated file has AUTO-GENERATED header", () => {
    const content = readFileSync(generatedPath, "utf-8");
    expect(content).toContain("AUTO-GENERATED");
  });

  it("exports a schema for every BlocksComponentRegistry entry", () => {
    const content = readFileSync(generatedPath, "utf-8");
    const expectedSchemas = [
      "slaIndicatorPropsSchema",
      "executionMonitorPropsSchema",
      "kpiMetricRowPropsSchema",
      "approvalGatePropsSchema",
      "serviceCardPropsSchema",
      "slaBreachPolicyPropsSchema",
      "trustFeedbackDisplayPropsSchema",
      "similarityPanelPropsSchema",
      "complianceSummaryPropsSchema",
      "gdprErasureActionPropsSchema",
      "workItemRowPropsSchema",
      "dimensionDashboardPropsSchema",
      "routingRationalePropsSchema",
      "trustScorePanelPropsSchema",
      "groupedDataViewPropsSchema",
      "auditTrailViewerPropsSchema",
      "listPanePropsSchema",
      "detailPanePropsSchema",
      "workItemInboxPropsSchema",
      "workItemDetailPropsSchema",
      "workItemWorkbenchPropsSchema",
      "workerTaskPanePropsSchema",
      "notificationInboxPropsSchema",
      "notificationBellPropsSchema",
      "subscriptionEditorPropsSchema",
      "notificationPreferencesPropsSchema",
      "channelActivityPropsSchema",
      "convergenceIndicatorPropsSchema",
      "commonGroundPanelPropsSchema",
      "conversationWorkbenchPropsSchema",
      "pointListPropsSchema",
      "pointDetailPropsSchema",
      "caseExplorerPropsSchema",
      "entityListPropsSchema",
      "entityDetailPropsSchema",
      "entityTreePropsSchema",
      "orchestrationWorkbenchPropsSchema",
      "dagViewerPropsSchema",
      "decompositionTreePropsSchema",
      "planItemTreePropsSchema",
      "planModelDashboardPropsSchema",
      "caseFlowViewerPropsSchema",
      "caseDependencyGraphPropsSchema",
      "diagramWorkbenchPropsSchema",
      "clusterPanelPropsSchema",
      "reconciliationStatusPropsSchema",
      "topologyViewerPropsSchema",
      "sessionListPropsSchema",
      "sessionDetailPropsSchema",
      "sessionWorkbenchPropsSchema",
      "preferencesEditorPropsSchema",
      "trustWorkbenchPropsSchema",
      "contributorWorkbenchPropsSchema",
      "commitmentRangeBarPropsSchema",
      "commitmentTransitionBadgePropsSchema",
    ];
    for (const name of expectedSchemas) {
      expect(content).toContain(`export const ${name}`);
    }
  });

  it("does not contain function-typed properties", () => {
    const content = readFileSync(generatedPath, "utf-8");
    expect(content).not.toContain("renderAgent:");
    expect(content).not.toContain("renderModel:");
    expect(content).not.toContain("renderCandidate:");
  });

  it("exports blocksComponentSchemaMap", () => {
    const content = readFileSync(generatedPath, "utf-8");
    expect(content).toContain("export const blocksComponentSchemaMap");
  });

  it("generated schemas parse valid sla-indicator data", async () => {
    const { slaIndicatorPropsSchema } = await import(
      "./component-schemas.generated.js"
    );
    const result = slaIndicatorPropsSchema.safeParse({
      deadline: "2026-12-31T23:59:59Z",
      slaWindow: null,
      warningThreshold: 0.25,
      criticalThreshold: 0.10,
      escalationStage: null,
      compact: true,
    });
    expect(result.success).toBe(true);
  });

  it("generated schemas reject unknown properties in strict mode", async () => {
    const { slaIndicatorPropsSchema } = await import(
      "./component-schemas.generated.js"
    );
    const result = slaIndicatorPropsSchema.strict().safeParse({
      deadline: "2026-12-31T23:59:59Z",
      slaWindow: null,
      warningThreshold: 0.25,
      criticalThreshold: 0.10,
      escalationStage: null,
      compact: true,
      unknownProp: "should fail",
    });
    expect(result.success).toBe(false);
  });

  it("generated schemas parse valid approval-gate data", async () => {
    const { approvalGatePropsSchema } = await import(
      "./component-schemas.generated.js"
    );
    const result = approvalGatePropsSchema.safeParse({
      gateId: "gate-1",
      endpoint: "/api/gates/gate-1",
      identity: { userId: "u1", displayName: "Alice", groups: ["admin"] },
      prompt: "Approve this?",
      contextText: "",
      outcomes: [{ key: "approve", label: "Approve", variant: "success" }],
      quorum: null,
      deadline: null,
      slaWindow: null,
      history: [],
      data: null,
      requireConfirmation: true,
    });
    expect(result.success).toBe(true);
  });

  it("generated file is not stale", () => {
    const current = readFileSync(generatedPath, "utf-8");
    execSync(
      "yarn workspace @casehubio/blocks-ui-schema run generate",
      { stdio: "pipe" },
    );
    const regenerated = readFileSync(generatedPath, "utf-8");
    expect(regenerated).toBe(current);
  }, 30_000);
});
