/* eslint-disable */
/**
 * This file was automatically generated from CaseDefinition.yaml.
 * DO NOT MODIFY BY HAND. Run `yarn generate:types` to regenerate.
 */

/**
 * The version of the DSL used by the CaseHub.
 */
export type CaseHubDSL = string;
/**
 * Expression language for all condition expressions in this definition. Must match the type() of a registered ExpressionEngine that overrides create(). Defaults to "jq". Constraint: expressionLang == ExpressionEvaluator.type() == ExpressionEngine.type().
 *
 */
export type ExpressionLang = string;
/**
 * The CaseHub's namespace.
 */
export type CaseHubNamespace = string;
/**
 * The CaseHub's name.
 */
export type CaseHubName = string;
/**
 * The CaseHub's semantic version.
 */
export type CaseHubVersion = string;
/**
 * The CaseHub's title.
 */
export type CaseHubTitle = string;
/**
 * The CaseHub's Markdown summary.
 */
export type CaseHubSummary = string;
/**
 * Behavioral type classifications for this case definition. Each entry is a hierarchical path string parsed via Path.parse(). Types affect engine behavior — routing, dispatch, completion strategy.
 *
 */
export type CaseHubTypes = string[];
/**
 * Operational classification labels for this case definition. Each entry is a hierarchical path string parsed via Path.parse(). Labels affect organization — queues, dashboards, analytics.
 *
 */
export type CaseHubLabels = string[];
/**
 * Typed signal declarations for this case definition. Each signal has a name and a contextType (fully qualified Java class name). When declared, only signals with matching name and payload type are accepted on the typed API.
 *
 */
export type CaseSignals = {
  /**
   * Signal name — must be unique within the definition
   */
  name: string;
  /**
   * Fully qualified Java class name for the signal payload type
   */
  contextType: string;
  [k: string]: unknown | undefined;
}[];
/**
 * Label evaluation rules for case queue management. Evaluated on every context change via CaseLabelEvaluator. Each rule's condition is a JQ predicate over the working layer; actions add or remove labels.
 *
 */
export type CaseLabelRules = LabelRule[];
/**
 * Bridges inbound connector messages to typed case signals. Each mapping declares a signal name, connector type, correlation expression (resolves to a case ID), and payload expression (extracts the signal payload).
 *
 */
export type CaseInboundMappings = InboundSignalMapping[];
/**
 * Milestone name
 */
export type MilestoneName = string;
/**
 * What this milestone represents
 */
export type MilestoneDescription = string;
/**
 * JQ expression — true means milestone is reached
 */
export type MilestoneCondition = string;
/**
 * Unique capability identifier
 */
export type CapabilityName = string;
/**
 * What this capability represents
 */
export type CapabilityDescription = string;
export type GoalExpression =
  | (
      | {
          /**
           * All listed goals/expressions must be satisfied. Items are goal names (strings) or nested GoalExpression objects.
           *
           * @minItems 1
           */
          allOf?: [string | GoalExpression | undefined, ...(string | GoalExpression | undefined)[]];
          /**
           * At least one listed goal/expression must be satisfied. Items are goal names (strings) or nested GoalExpression objects.
           *
           * @minItems 1
           */
          anyOf?: [string | GoalExpression | undefined, ...(string | GoalExpression | undefined)[]];
          [k: string]: unknown | undefined;
        }
      | (undefined & GoalExpression1)
    )
  | undefined;
export type GoalExpression1 = {
  [k: string]: unknown | undefined;
};
export type Binding = {
  name?: string;
  on: Trigger;
  /**
   * JQ over context and/or event
   */
  when?: string;
  capability?: string;
  subCase?: SubCase;
  humanTask?: HumanTask;
  /**
   * Strategy for resolving concurrent writes to the same CaseContext key
   */
  conflictResolverStrategy?: "LAST_WRITER_WINS" | "FIRST_WRITER_WINS" | "FAIL" | "DEEP_MERGE";
  outcomePolicy?: OutcomePolicy;
  /**
   * JQ expression overriding the capability's input projection for this binding. Use for failure cascade scope reduction.
   */
  inputProjectionOverride?: string;
  /**
   * Key-value pairs to write to the case context before dispatching. Prevents condition re-evaluation loops in failure cascades.
   */
  contextWrite?: {
    [k: string]: unknown | undefined;
  };
  /**
   * Context keys this binding is expected to produce. Used for static cycle detection and dependency reasoning.
   */
  producedKeys?: string[];
  /**
   * Scope governing worker lifetime. BINDING = single dispatch (default). COMPOUND = lives for compound duration. CASE = lives for case duration.
   */
  lifecycleScope?: "BINDING" | "COMPOUND" | "CASE";
  /**
   * PARTICIPANT blocks completion. COMPANION is a sidecar excluded from completion evaluation.
   */
  participation?: "PARTICIPANT" | "COMPANION";
  /**
   * TRANSIENT = fire-and-forget (default). PERSISTENT = long-running virtual thread with mailbox. REINVOKED = re-invoked on each trigger with accumulated state.
   */
  executionMode?: "TRANSIENT" | "PERSISTENT" | "REINVOKED";
  [k: string]: unknown | undefined;
} & Binding1;
/**
 * Defines what the Worker observes. Exactly one of: contextChange, cloudEvent, schedule, scopeActivated.
 *
 */
export type Trigger = {
  contextChange?: ContextChangeTrigger;
  cloudEvent?: CloudEventTrigger;
  schedule?: ScheduleTrigger;
  scopeActivated?: ScopeActivatedTrigger;
  [k: string]: unknown | undefined;
} & Trigger1;
/**
 * Fires on matching CloudEvents.
 */
export type CloudEventTrigger =
  | string
  | {
      /**
       * CloudEvent type exact match
       */
      type: string;
      /**
       * Optional exact match on CloudEvent source
       */
      source?: string;
      /**
       * Optional exact match on CloudEvent subject
       */
      subject?: string;
      /**
       * JQ predicate over { context, event } where event is the CloudEvent envelope
       */
      filter?: string;
    };
/**
 * Time-based trigger.
 */
export type ScheduleTrigger = {
  /**
   * Cron expression (define the dialect in docs: e.g. cron/Quartz).
   */
  cron?: string;
  /**
   * ISO-8601 duration, e.g. PT5M.
   */
  every?: string;
  /**
   * IANA TZ, e.g. America/Vancouver
   */
  timezone?: string;
} & ScheduleTrigger1;
export type ScheduleTrigger1 = {
  [k: string]: unknown | undefined;
};
export type Trigger1 = {
  [k: string]: unknown | undefined;
};
/**
 * A binding target that creates a WorkItem in casehub-work and resumes the case when the WorkItem reaches a terminal state. Inline mode requires title; template mode requires templateRef. The two modes are mutually exclusive.
 */
export type HumanTask = {
  /**
   * WorkItem title — inline mode
   */
  title?: string;
  /**
   * JQ expression resolving to the WorkItem title from case context (e.g. '"IRB Review — " + .protocol.id')
   */
  titleExpression?: string;
  /**
   * WorkItemTemplate reference (UUID or name) — template mode
   */
  templateRef?: string;
  /**
   * JQ expression: case context → WorkItem payload
   */
  inputMapping?: string;
  /**
   * JQ expression: WorkItem resolution → case context updates
   */
  outputMapping?: string;
  /**
   * Hierarchical scope path for SLA preference resolution (e.g. "casehubio/devtown/pr-review"). Null resolves preferences at root scope. Follow the platform convention: org / app / case-type.
   */
  scope?: string;
  /**
   * JQ expression resolving to the scope path from case context (e.g. '.trial.site.code')
   */
  scopeExpression?: string;
  candidateGroups?: string[] | string;
  candidateUsers?: string[] | string;
  /**
   * ISO 8601 duration after which the WorkItem expires (e.g. PT24H)
   */
  expiresIn?: string;
  /**
   * JQ expression resolving to an ISO-8601 duration from case context (e.g. '.trial.regulatoryDeadlineDuration')
   */
  expiresInExpression?: string;
  /**
   * Business hours allowed to claim this WorkItem before it escalates
   */
  claimDeadlineHours?: number;
  /**
   * JQ expression evaluated against the case context WORKING layer at scheduling time. Must produce an ISO-8601 Instant string (e.g. ".indReportingDeadline"). Validated at YAML load time. Used to enforce an absolute deadline derived from domain data (e.g. ae.reportedAt + window) rather than a relative duration from WorkItem creation.
   *
   */
  expiresAtExpression?: string;
  /**
   * Valid outcome names for this WorkItem (e.g. APPROVED, REJECTED). Enforced at completion by casehub-work.
   */
  outcomes?: string[];
  /**
   * Fully-qualified Java class name for typed payload validation via ContextBridge. Engine validates inputMapping output against this type at dispatch time.
   */
  payloadType?: string;
  /**
   * Fully-qualified Java class name for typed resolution validation via ContextBridge. Engine validates WorkItem resolution against this type at completion time.
   */
  resolutionType?: string;
  [k: string]: unknown | undefined;
} & HumanTask1;
export type HumanTask1 = {
  [k: string]: unknown | undefined;
};
export type Binding1 = {
  [k: string]: unknown | undefined;
};
/**
 * Worker name
 */
export type WorkerName = string;
/**
 * What this worker does
 */
export type WorkerDescription = string;
/**
 * Capabilities this Worker owns and can perform
 *
 * @minItems 1
 */
export type WorkerCapabilities = [string, ...string[]];

/**
 * Case Hub schema for coordination and observability of Cases.
 * The Reactor is the minimal core: it manages state, publishes events, detects milestones, and provides observability. It does NOT initiate work, assign tasks, or make decisions on behalf of participants.
 * Workers are autonomous participants. They observe CaseContext and events, make local decisions, and act based on their own capabilities.
 * Case Hub is choreography-oriented by default.
 *
 */
export interface CaseHub {
  dsl: CaseHubDSL;
  expressionLang?: ExpressionLang;
  namespace: CaseHubNamespace;
  name: CaseHubName;
  version: CaseHubVersion;
  title?: CaseHubTitle;
  summary?: CaseHubSummary;
  types?: CaseHubTypes;
  labels?: CaseHubLabels;
  use?: Use;
  /**
   * Static domain knowledge injected into the semantic layer at case start
   */
  semanticData?: {
    [k: string]: unknown | undefined;
  };
  /**
   * Episodic memory configuration for this case definition
   */
  episodic?: {
    memory?: {
      /**
       * MemoryDomain name (e.g. "fraud-check")
       */
      domain: string;
      /**
       * JQ expression evaluated against semantic layer to resolve entity ID(s)
       */
      entityId: string;
      /**
       * Max items to return; default 10
       */
      recent?: number;
      [k: string]: unknown | undefined;
    };
    [k: string]: unknown | undefined;
  };
  /**
   * User-defined layer names for this case definition
   */
  layers?: {
    /**
     * User-defined layer name
     */
    name: string;
    [k: string]: unknown | undefined;
  }[];
  /**
   * Context store configuration for this case definition
   */
  context?: {
    /**
     * Strategy ID for CaseContextStoreFactory resolution via EngineStrategyResolver. Default: "in-memory". Persistent stores (e.g. Redis-backed) must implement isDurable()=true and the recovery path.
     *
     */
    storeFactory?: string;
    [k: string]: unknown | undefined;
  };
  signals?: CaseSignals;
  labelRules?: CaseLabelRules;
  inboundMappings?: CaseInboundMappings;
  spec: CaseDefinitionSpec;
  [k: string]: unknown | undefined;
}
/**
 * Declares external dependencies (secrets, config maps) required by this Case definition. Secrets are validated at load time for fail-fast behavior. ConfigMaps provide non-sensitive configuration accessible via ${$config.*} in JQ.
 *
 */
export interface Use {
  /**
   * Secret names required by this Case definition. Validated at load time via SecretManager.secret(). Accessible in JQ expressions via ${$secret.{name}.{property}}
   *
   */
  secrets?: string[];
  /**
   * Config map names required by this Case definition. Validated at load time via ConfigManager - checks that properties with {configMapName}. prefix exist. Accessible in JQ expressions via ${$config.{name}.{property}}
   *
   */
  configMaps?: string[];
  [k: string]: unknown | undefined;
}
/**
 * A label evaluation rule. Condition is a JQ predicate evaluated against the working layer on every context change. Actions add or remove labels from the case instance. Evaluation uses clean-slate semantics per cycle.
 *
 */
export interface LabelRule {
  /**
   * Unique rule name within the definition
   */
  name: string;
  /**
   * JQ predicate over the working layer — rule fires when true
   */
  when: string;
  /**
   * Label actions to apply when the rule fires
   *
   * @minItems 1
   */
  actions: [
    (
      | {
          [k: string]: unknown | undefined;
        }
      | {
          [k: string]: unknown | undefined;
        }
    ),
    ...(
      | {
          [k: string]: unknown | undefined;
        }
      | {
          [k: string]: unknown | undefined;
        }
    )[]
  ];
  [k: string]: unknown | undefined;
}
/**
 * Maps inbound connector messages to typed case signals. The correlation expression resolves to a case ID; the payload expression extracts the signal payload. Evaluated by InboundSignalBridge.
 *
 */
export interface InboundSignalMapping {
  /**
   * Signal name — must reference a declared SignalType on the same definition. Validated at YAML load time.
   *
   */
  signal: string;
  /**
   * Connector type discriminator (e.g. "slack", "email")
   */
  connectorType: string;
  /**
   * JQ expression or ExpressionEvaluator resolving to the target case UUID
   */
  correlation: string;
  /**
   * JQ expression or ExpressionEvaluator extracting the signal payload from the message
   */
  payload: string;
  /**
   * Strategy ID for CaseCorrelationResolver. Default: "uuid" (direct UUID parsing). Custom resolvers register via CDI as NamedStrategy beans.
   *
   */
  correlationResolver?: string;
  [k: string]: unknown | undefined;
}
/**
 * Case definition specification. unevaluatedProperties is true because the spec is an extension point — plugin modules may add their own configuration blocks (e.g. cbr, routing strategies, future plugins) without requiring schema changes.
 *
 */
export interface CaseDefinitionSpec {
  /**
   * Observable progress markers derived from CaseContext. The Reactor evaluates milestone conditions on every context change and publishes MilestoneReached events. Milestones provide visibility, not control flow.
   *
   */
  milestones?: Milestone[];
  /**
   * Capabilities define what Workers can do. A capability is a declared competence with a defined input/output contract and shared vocabulary for discovery.
   *
   */
  capabilities?: Capability[];
  /**
   * Desired end-states expressed as JQ predicates over the CaseContext. Goals provide outcome-oriented observability and can be used to determine Case completion (success/failure), without prescribing control flow or assigning work.
   *
   */
  goals?: Goal[];
  completion?: CaseCompletion;
  /**
   * Planning strategy ID for this case. Resolved via StrategyResolver. Built-in: "default" (choreography), "sequential". Plugin strategies register via CDI as NamedStrategy beans.
   *
   */
  planningStrategy?: string;
  /**
   * HTN decomposition strategy ID. Resolved via StrategyResolver. Default: "identity". Plugin strategies register via CDI.
   *
   */
  decompositionStrategy?: string;
  /**
   * Agent routing strategy ID. Selects which worker instance handles a task. Resolved via StrategyResolver. Default: "composable".
   *
   */
  agentRouting?: string;
  /**
   * Implementation routing strategy ID. Selects which binding(s) handle a capability when multiple bindings target the same capability. Resolved via StrategyResolver. Default: runs all.
   *
   */
  implementationRouting?: string;
  /**
   * HumanTask routing strategy ID. Enriches humanTask candidate sets with historical data. Resolved via StrategyResolver.
   *
   */
  humanTaskRouting?: string;
  /**
   * Candidate matching strategy ID. Controls how worker capabilities are matched to binding requirements. Built-in: "exact", "subsumption". Resolved via StrategyResolver.
   *
   */
  candidateMatching?: string;
  /**
   * Per-signal-provider weight configuration for composable agent routing. Keys are signal provider IDs (e.g. "workload", "trust", "experience", "personality", "semantic"). Values are weights. When present, only named providers are called with given weights.
   *
   */
  routingSignalWeights?: {
    [k: string]: number | undefined;
  };
  cbr?: Cbr;
  /**
   * Bindings connect trigger conditions to worker capabilities. When a binding's trigger condition is met, the associated capability is invoked.
   *
   */
  bindings?: Binding[];
  /**
   * Autonomous participants that observe CaseContext and events, make local decisions, and perform work.
   *
   */
  workers?: Worker[];
  authorization?: Authorization;
  [k: string]: unknown | undefined;
}
/**
 * Observable progress marker. The Reactor evaluates milestone conditions on every context change and publishes MilestoneReached events. Milestones provide visibility, not control flow.
 *
 */
export interface Milestone {
  name: MilestoneName;
  description?: MilestoneDescription;
  condition: MilestoneCondition;
  /**
   * JQ predicate — milestone becomes ACTIVE when true (default: always true)
   */
  entryCriteria?: string;
  /**
   * ISO-8601 duration for SLA deadline (e.g. PT2H, PT24H). Must be positive if present.
   */
  slaDuration?: string;
  /**
   * When SLA clock starts. Only CASE_CREATED and MILESTONE_ACTIVATED are currently implemented.
   */
  slaStartFrom?: "CASE_CREATED" | "MILESTONE_ACTIVATED" | "PREVIOUS_MILESTONE_COMPLETED" | "EVENT_OCCURRED";
  [k: string]: unknown | undefined;
}
/**
 * A capability that a Worker can perform. It declares what a Worker is able to do and defines the contract (input/output schema) for that capability.
 *
 */
export interface Capability {
  name: CapabilityName;
  description?: CapabilityDescription;
  /**
   * JQ expression producing capability input from case context
   */
  inputProjection?: string;
  /**
   * JQ expression producing capability output from worker result
   */
  outputProjection?: string;
  /**
   * Weighted cognitive function demand profile for this capability. Keys are Jungian function names (Ti, Te, Fi, Fe, Si, Se, Ni, Ne). Values are weights that should sum to 1.0. Used by PersonalitySignalProvider for JPAF personality-adaptive routing.
   *
   */
  cognitiveDemand?: {
    [k: string]: number | undefined;
  };
  [k: string]: unknown | undefined;
}
export interface Goal {
  /**
   * Unique goal identifier
   */
  name: string;
  description?: string;
  /**
   * Goal kind label — built-in kinds are 'success' and 'failure'; domains may define custom kinds
   */
  kind?: string;
  /**
   * JQ predicate over CaseContext
   */
  condition: string;
  [k: string]: unknown | undefined;
}
/**
 * Defines when a Case instance is considered terminally completed (success) or terminally failed based on Goal satisfaction and/or a direct JQ predicate. The Reactor evaluates completion on every CaseContext change and may emit CaseCompleted/CaseFailed events.
 *
 */
export interface CaseCompletion {
  /**
   * Optional JQ predicate over CaseContext as an override/shortcut
   */
  doneWhen?: string;  [k: string]: GoalExpression | string | undefined;
}
/**
 * CBR (Case-Based Reasoning) retrieval configuration. Declares how to extract features from the case context for similarity-based retrieval of past case experiences at routing time.
 *
 */
export interface Cbr {
  /**
   * Map of feature name to JQ expression. Each expression is evaluated against the working layer to extract a feature value for CBR retrieval.
   *
   */
  features: {
    [k: string]: string | undefined;
  };
  /**
   * Per-feature weight overrides for similarity scoring.
   */
  weights?: {
    [k: string]: number | undefined;
  };
  /**
   * Maximum number of similar cases to retrieve.
   */
  topK?: number;
  /**
   * Minimum similarity score threshold.
   */
  minSimilarity?: number;
  /**
   * Blend factor between feature similarity and vector similarity.
   */
  vectorWeight?: number;
  /**
   * MemoryDomain name for CBR retrieval. Defaults to episodicMemory.domain if not specified.
   *
   */
  domain?: string;
  /**
   * CBR case type for retrieval. Defaults to the case definition name if not specified.
   *
   */
  caseType?: string;
  /**
   * CbrCase Java class discriminator for deserialization. Identifies which CbrCase subtype to use. Built-in: "plan" (PlanCbrCase), "feature-vector" (FeatureVectorCbrCase), "textual" (TextualCbrCase). Extensible via CbrCaseTypeRegistration CDI bean. Distinct from caseType (query filter).
   *
   */
  cbrType?: string;
  /**
   * Retrieval timing strategy. 'per-evaluation' retrieves on every evaluation (default). 'case-lifetime' retrieves once on first access and caches the result for the case's lifetime.
   *
   */
  timing?: "per-evaluation" | "case-lifetime";
  /**
   * Half-life in days for temporal decay during retrieval. Older cases lose relevance via similarity *= 0.5^(age / halfLife). Null means no decay (backward compatible).
   *
   */
  temporalDecayHalfLifeDays?: number;
  [k: string]: unknown | undefined;
}
/**
 * Fires when CaseContext changes.
 */
export interface ContextChangeTrigger {
  /**
   * JQ predicate over { context, event } where event is a synthetic ContextChanged envelope
   */
  filter?: string;
  /**
   * Optional layer name; if set, binding only re-evaluates when this layer changes
   */
  listenLayer?: string;
}
/**
 * Fires when the owning scope (compound or case) becomes active. Used for lifecycle-scoped workers.
 */
export interface ScopeActivatedTrigger {}
/**
 * Identifies a child case definition to launch as part of a Binding's work. When a binding with a subCase is triggered, a child CaseInstance is spawned. The parent case can optionally wait for the child to complete (WAITING state) and merge the child's final context back into the parent context.
 *
 */
export interface SubCase {
  /**
   * Child case definition namespace
   */
  namespace: string;
  /**
   * Child case definition name
   */
  name: string;
  /**
   * Child case definition semantic version
   */
  version: string;
  /**
   * Strategy for determining when the child case is considered complete
   */
  completionStrategy?: "DEFAULT" | "CUSTOM";
  /**
   * If true, parent transitions to WAITING until child reaches a terminal state
   */
  waitForCompletion?: boolean;
  /**
   * JQ expression to map parent CaseContext to child initial context
   */
  inputMapping?: string;
  /**
   * Optional JQ expression to map child final context back to parent (null = no merge)
   */
  outputMapping?: string;
  /**
   * Maximum self-referencing depth. 0 = no recursion (default). N = allow N levels.
   */
  maxRecursionDepth?: number;
  /**
   * Groups multiple sub-case spawns under one M-of-N completion policy
   */
  groupId?: string;
  /**
   * Total children expected in this group
   */
  totalInGroup?: number;
  /**
   * How many must complete to trigger threshold (default: totalInGroup)
   */
  requiredCount?: number;
  /**
   * KEEP leaves remaining children running; CANCEL stops them
   */
  onThresholdReached?: "KEEP" | "CANCEL";
  [k: string]: unknown | undefined;
}
/**
 * Policy for handling semantic worker outcomes (DECLINED, FAILED, EXPIRED)
 */
export interface OutcomePolicy {
  /**
   * Action when a worker returns DECLINED
   */
  onDecline?: "REROUTE" | "FAULT";
  /**
   * Action when a worker returns FAILED
   */
  onFailure?: "REROUTE" | "FAULT";
  /**
   * Action when a worker's commitment expires
   */
  onExpired?: "REROUTE" | "FAULT";
  /**
   * Maximum dispatch+outcome cycles before writing REROUTES_EXHAUSTED
   */
  maxRerouteAttempts?: number;
  [k: string]: unknown | undefined;
}
/**
 * A Worker is an autonomous participant that owns one or more capabilities. Workers observe CaseContext and events, make local decisions, and perform work independently.
 * Worker function configuration (agent, do, mcp, http, etc.) is plugin-supplied. additionalProperties is true because Worker is an extension point — new function types can be added without schema changes. The WorkerFunctionProviderRegistry dispatches to the correct provider based on the raw YAML content.
 *
 */
export interface Worker {
  name: WorkerName;
  description?: WorkerDescription;
  capabilities: WorkerCapabilities;
  executionPolicy?: ExecutionPolicy;
  /**
   * Sequential composition of other workers. Each step name must reference a worker defined earlier in the workers list.
   *
   */
  sequence?: string[];
  /**
   * Fully qualified Java class name for typed worker function input. Used by ContextBridge protocol for POJO deserialization. When set, the engine creates a typed WorkerFunction.Sync<T>.
   *
   */
  contextType?: string;
  /**
   * Fully qualified Java class name for typed worker function output. Used by ContextBridge protocol for output serialization. Defaults to java.util.Map when not specified.
   *
   */
  outputType?: string;
  [k: string]: unknown | undefined;
}
/**
 * Default execution policy for this Worker. These are defaults and may be overridden by workflow/state-specific settings (if present).
 *
 */
export interface ExecutionPolicy {
  /**
   * Default timeout for a single work execution/invocation
   */
  timeoutMs?: number;
  retries?: RetryPolicy;
  [k: string]: unknown | undefined;
}
/**
 * Default retry policy
 */
export interface RetryPolicy {
  /**
   * Total attempts including the first one
   */
  maxAttempts?: number;
  /**
   * Delay in milliseconds between retry attempts
   */
  delayMs?: number;
  [k: string]: unknown | undefined;
}
/**
 * ACL grants created when a case instance of this type is started. Maps AclAction to groups. Absent = no ACL enforcement (NoOp default).
 *
 */
export interface Authorization {
  /**
   * Groups granted READ — query case, view plan items, event log, work items
   */
  read?: string[];
  /**
   * Groups granted WRITE — signal, update context, assign work items
   */
  write?: string[];
  /**
   * Groups granted ADMIN — start, close, suspend, resume, dispatch
   */
  admin?: string[];
  /**
   * Groups granted CLAIM — claim work items for execution
   */
  claim?: string[];
  [k: string]: unknown | undefined;
}
