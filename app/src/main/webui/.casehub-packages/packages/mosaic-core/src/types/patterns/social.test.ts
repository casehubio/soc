import { describe, it, expectTypeOf } from 'vitest';
import type {
  CognitionConfig, MoodConfigSpec, DriveConfigSpec,
  PersonalityEvolutionConfigSpec, NarrativeConfigSpec,
  GoalProposalConfigSpec, CognitiveGoalConfigSpec,
  MentalModelConfigSpec, CollectiveGoalConfigSpec,
  NormDetectionConfigSpec, GoalEscalationConfigSpec,
  UserModelConfigSpec, StrategyLearningConfigSpec,
  SocialPatternCategory, RetentionConfig,
} from './social.js';

describe('CognitionConfig types', () => {
  it('cognition sections are typed interfaces, not Record<string, unknown>', () => {
    const config: CognitionConfig = {
      mood: {
        baseline: { pleasure: 0, arousal: 0, dominance: 0 },
        decayTimeConstant: 'PT4H',
        maxDisplacement: 1.0,
        moodInfluence: 0.5,
        staleStateTimeout: 'PT24H',
      },
      drive: {
        axisWeights: { curiosity: 0.8 },
        changeThreshold: 0.1,
        maxIntensity: 1.0,
        minIntensity: 0.0,
      },
      retention: { retentionThreshold: 0.6, confidenceWeight: 0.4 },
    };
    expectTypeOf(config.mood).toEqualTypeOf<MoodConfigSpec | undefined>();
    expectTypeOf(config.drive).toEqualTypeOf<DriveConfigSpec | undefined>();
    expectTypeOf(config.retention).toEqualTypeOf<RetentionConfig | undefined>();
  });

  it('all 13 section types are exported and assignable', () => {
    expectTypeOf<CognitionConfig['drive']>().toEqualTypeOf<DriveConfigSpec | undefined>();
    expectTypeOf<CognitionConfig['mood']>().toEqualTypeOf<MoodConfigSpec | undefined>();
    expectTypeOf<CognitionConfig['personalityEvolution']>().toEqualTypeOf<PersonalityEvolutionConfigSpec | undefined>();
    expectTypeOf<CognitionConfig['userModel']>().toEqualTypeOf<UserModelConfigSpec | undefined>();
    expectTypeOf<CognitionConfig['strategyLearning']>().toEqualTypeOf<StrategyLearningConfigSpec | undefined>();
    expectTypeOf<CognitionConfig['mentalModel']>().toEqualTypeOf<MentalModelConfigSpec | undefined>();
    expectTypeOf<CognitionConfig['narrative']>().toEqualTypeOf<NarrativeConfigSpec | undefined>();
    expectTypeOf<CognitionConfig['goalProposal']>().toEqualTypeOf<GoalProposalConfigSpec | undefined>();
    expectTypeOf<CognitionConfig['goalEscalation']>().toEqualTypeOf<GoalEscalationConfigSpec | undefined>();
    expectTypeOf<CognitionConfig['normDetection']>().toEqualTypeOf<NormDetectionConfigSpec | undefined>();
    expectTypeOf<CognitionConfig['collectiveGoal']>().toEqualTypeOf<CollectiveGoalConfigSpec | undefined>();
    expectTypeOf<CognitionConfig['cognitiveGoal']>().toEqualTypeOf<CognitiveGoalConfigSpec | undefined>();
  });

  it('SocialPatternCategory.cognition uses typed CognitionConfig', () => {
    expectTypeOf<SocialPatternCategory['cognition']>()
      .toEqualTypeOf<CognitionConfig | undefined>();
  });
});
