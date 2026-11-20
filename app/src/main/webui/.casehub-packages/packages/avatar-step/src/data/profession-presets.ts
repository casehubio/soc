export interface RoleVariant {
  readonly archetype: string;
  readonly label: string;
  readonly description: string;
}

export interface ProfessionRole {
  readonly role: string;
  readonly variants: readonly RoleVariant[];
}

export const PROFESSION_PRESETS: Record<string, readonly ProfessionRole[]> = {
  Software: [
    { role: 'Architect', variants: [
      { archetype: 'Sage/Mentor', label: 'The guiding architect', description: 'Shares deep knowledge, mentors through expertise' },
      { archetype: 'Magician/Engineer', label: 'The systems architect', description: 'Designs elegant transformative solutions' },
      { archetype: 'Sage/Detective', label: 'The analytical architect', description: 'Investigates and solves structural problems' },
    ]},
    { role: 'QA Lead', variants: [
      { archetype: 'Sage/Detective', label: 'The investigator', description: 'Uncovers defects through systematic analysis' },
      { archetype: 'Sovereign/Judge', label: 'The standards enforcer', description: 'Upholds quality gates, renders pass/fail verdicts' },
      { archetype: 'Magician/Scientist', label: 'The test automator', description: 'Builds rigorous testing systems and frameworks' },
    ]},
    { role: 'DevOps Engineer', variants: [
      { archetype: 'Explorer/Pioneer', label: 'The infrastructure trailblazer', description: 'Pushes into new tooling and platforms' },
      { archetype: 'Magician/Engineer', label: 'The automation builder', description: 'Designs CI/CD pipelines and self-healing systems' },
      { archetype: 'Hero/Rescuer', label: 'The incident responder', description: 'Runs toward production fires, keeps systems alive' },
    ]},
    { role: 'Product Manager', variants: [
      { archetype: 'Sovereign/Ambassador', label: 'The stakeholder navigator', description: 'Represents users, builds consensus across teams' },
      { archetype: 'Magician/Innovator', label: 'The visionary PM', description: 'Sees market gaps, creates new product categories' },
      { archetype: 'Explorer/Generalist', label: 'The discovery PM', description: 'Bridges disciplines, explores possibilities broadly' },
    ]},
    { role: 'Tech Lead', variants: [
      { archetype: 'Sage/Mentor', label: 'The teaching lead', description: 'Guides team through deep technical expertise' },
      { archetype: 'Sovereign/Ruler', label: 'The directing lead', description: 'Creates order, drives execution, manages delivery' },
      { archetype: 'Magician/Engineer', label: 'The systems lead', description: 'Designs architecture, solves the hardest problems' },
    ]},
    { role: 'UX Designer', variants: [
      { archetype: 'Creator/Artist', label: 'The aesthetic designer', description: 'Creates from emotional truth, form matters' },
      { archetype: 'Sage/Detective', label: 'The UX researcher', description: 'Investigates user behaviour through systematic study' },
      { archetype: 'Caregiver/Healer', label: 'The empathic designer', description: 'Designs to reduce user pain and friction' },
    ]},
    { role: 'Security Engineer', variants: [
      { archetype: 'Sage/Detective', label: 'The threat hunter', description: 'Investigates vulnerabilities through systematic analysis' },
      { archetype: 'Hero/Rescuer', label: 'The incident responder', description: 'Acts decisively when systems are under attack' },
      { archetype: 'Sovereign/Judge', label: 'The compliance guardian', description: 'Enforces security standards and audit gates' },
    ]},
    { role: 'Data Scientist', variants: [
      { archetype: 'Sage/Detective', label: 'The analytical scientist', description: 'Uncovers truth through data investigation' },
      { archetype: 'Magician/Scientist', label: 'The model builder', description: 'Discovers patterns through rigorous experimentation' },
      { archetype: 'Explorer/Seeker', label: 'The research scientist', description: 'Explores meaning in data, questions assumptions' },
    ]},
  ],
  Education: [
    { role: 'Teacher', variants: [
      { archetype: 'Caregiver/Healer', label: 'The nurturing educator', description: 'Restores confidence, transforms struggling students' },
      { archetype: 'Caregiver/Samaritan', label: 'The classroom manager', description: 'Shows up where needed, keeps things running' },
      { archetype: 'Sage/Mentor', label: 'The subject-matter guide', description: 'Develops potential through deep knowledge' },
    ]},
    { role: 'Principal', variants: [
      { archetype: 'Sovereign/Ruler', label: 'The systems administrator', description: 'Creates order, enforces standards, runs the institution' },
      { archetype: 'Sovereign/Ambassador', label: 'The community-facing leader', description: 'Represents the school, builds consensus with parents and staff' },
      { archetype: 'Caregiver/Guardian', label: 'The protective leader', description: 'Shields staff and students, enforces safety' },
    ]},
    { role: 'Counsellor', variants: [
      { archetype: 'Caregiver/Angel', label: 'The unconditional listener', description: 'Creates safe space, serves without judgment' },
      { archetype: 'Sage/Shaman', label: 'The intuitive guide', description: 'Sees beneath the surface, accesses deep insight' },
      { archetype: 'Caregiver/Healer', label: 'The restorative counsellor', description: 'Mends emotional damage, transforms patterns' },
    ]},
    { role: 'Researcher', variants: [
      { archetype: 'Sage/Detective', label: 'The evidence-driven investigator', description: 'Uncovers truth through systematic inquiry' },
      { archetype: 'Explorer/Seeker', label: 'The philosophical questioner', description: 'Explores meaning and pushes boundaries of knowledge' },
      { archetype: 'Magician/Scientist', label: 'The empirical discoverer', description: 'Rigorous experimentation, discovers through evidence' },
    ]},
    { role: 'Tutor', variants: [
      { archetype: 'Sage/Mentor', label: 'The patient guide', description: 'Develops potential through sustained one-on-one attention' },
      { archetype: 'Caregiver/Healer', label: 'The confidence builder', description: 'Repairs relationship with learning, transforms struggle' },
    ]},
  ],
  Legal: [
    { role: 'Litigator', variants: [
      { archetype: 'Hero/Warrior', label: 'The strategic trial fighter', description: 'Disciplined preparation, mission-focused advocacy' },
      { archetype: 'Hero/Liberator', label: 'The justice champion', description: 'Fights for clients\' freedom and systemic fairness' },
      { archetype: 'Rebel/Maverick', label: 'The unconventional advocate', description: 'Defies convention to find novel legal arguments' },
    ]},
    { role: 'Mediator', variants: [
      { archetype: 'Everyman/Advocate', label: 'The balanced voice', description: 'Bridges power gaps, speaks for fairness' },
      { archetype: 'Sage/Translator', label: 'The clarity broker', description: 'Makes each side\'s position intelligible to the other' },
      { archetype: 'Caregiver/Angel', label: 'The unconditional neutral', description: 'Holds space without judgment' },
    ]},
    { role: 'Compliance Officer', variants: [
      { archetype: 'Sovereign/Judge', label: 'The standards enforcer', description: 'Upholds rules impartially, renders compliance verdicts' },
      { archetype: 'Sage/Detective', label: 'The regulatory investigator', description: 'Uncovers non-compliance through systematic evidence' },
      { archetype: 'Everyman/Citizen', label: 'The responsible process-follower', description: 'Upholds community standards reliably' },
    ]},
    { role: 'Defence Attorney', variants: [
      { archetype: 'Rebel/Maverick', label: 'The convention-defying defender', description: 'Challenges prosecution assumptions their own way' },
      { archetype: 'Hero/Liberator', label: 'The freedom fighter', description: 'Systematic pursuit of client\'s liberty' },
      { archetype: 'Sage/Detective', label: 'The case investigator', description: 'Uncovers exculpatory evidence methodically' },
    ]},
    { role: 'Contracts Specialist', variants: [
      { archetype: 'Sage/Translator', label: 'The precise drafter', description: 'Makes complex agreements clear and unambiguous' },
      { archetype: 'Sovereign/Judge', label: 'The terms arbiter', description: 'Evaluates and enforces contractual standards' },
      { archetype: 'Sage/Detective', label: 'The clause analyst', description: 'Investigates risk in fine print' },
    ]},
  ],
  Medical: [
    { role: 'Surgeon', variants: [
      { archetype: 'Hero/Rescuer', label: 'The crisis operator', description: 'Decisive action under life-or-death pressure' },
      { archetype: 'Hero/Warrior', label: 'The disciplined technician', description: 'Strategic, mission-focused, relentless precision' },
      { archetype: 'Sage/Detective', label: 'The diagnostic surgeon', description: 'Methodical analysis before intervention' },
    ]},
    { role: 'GP', variants: [
      { archetype: 'Caregiver/Healer', label: 'The holistic family doctor', description: 'Treats the whole person, long-term relationships' },
      { archetype: 'Everyman/Citizen', label: 'The reliable community doctor', description: 'Shows up, follows through, steady presence' },
      { archetype: 'Caregiver/Samaritan', label: 'The practical responder', description: 'Immediate, hands-on care where needed' },
    ]},
    { role: 'Researcher', variants: [
      { archetype: 'Sage/Detective', label: 'The clinical investigator', description: 'Evidence-driven, systematic inquiry' },
      { archetype: 'Magician/Scientist', label: 'The empirical discoverer', description: 'Hypothesis-driven, rigorous methodology' },
      { archetype: 'Explorer/Pioneer', label: 'The translational researcher', description: 'Pushes from bench to bedside' },
    ]},
    { role: 'Nurse', variants: [
      { archetype: 'Caregiver/Samaritan', label: 'The bedside carer', description: 'Practical, immediate, shows up where needed' },
      { archetype: 'Caregiver/Guardian', label: 'The patient protector', description: 'Vigilant monitoring, boundary-setting' },
      { archetype: 'Caregiver/Healer', label: 'The restorative nurse', description: 'Emotional and physical mending' },
    ]},
    { role: 'Psychiatrist', variants: [
      { archetype: 'Sage/Shaman', label: 'The depth therapist', description: 'Deep pattern recognition, accesses insight from unseen sources' },
      { archetype: 'Caregiver/Healer', label: 'The restorative psychiatrist', description: 'Mends emotional and psychological damage' },
      { archetype: 'Sage/Mentor', label: 'The developmental guide', description: 'Develops patients\' potential through accumulated wisdom' },
    ]},
  ],
  Finance: [
    { role: 'Analyst', variants: [
      { archetype: 'Sage/Detective', label: 'The evidence-driven analyst', description: 'Investigates data, uncovers patterns' },
      { archetype: 'Magician/Scientist', label: 'The quantitative modeller', description: 'Builds rigorous analytical frameworks' },
      { archetype: 'Sage/Translator', label: 'The insight communicator', description: 'Makes complex analysis accessible to stakeholders' },
    ]},
    { role: 'Trader', variants: [
      { archetype: 'Explorer/Adventurer', label: 'The risk-taking explorer', description: 'Pushes into unknown territory, thrives on the unknown' },
      { archetype: 'Rebel/Gambler', label: 'The high-stakes player', description: 'Lives on the edge, embraces risk' },
      { archetype: 'Hero/Athlete', label: 'The competitive performer', description: 'Excellence through discipline, pushes personal limits' },
    ]},
    { role: 'Auditor', variants: [
      { archetype: 'Sovereign/Judge', label: 'The standards enforcer', description: 'Weighs evidence, renders compliance decisions' },
      { archetype: 'Sage/Detective', label: 'The forensic examiner', description: 'Investigates records, uncovers discrepancies' },
      { archetype: 'Everyman/Citizen', label: 'The reliable verifier', description: 'Responsible, thorough, upholds process' },
    ]},
    { role: 'Advisor', variants: [
      { archetype: 'Caregiver/Guardian', label: 'The protective wealth steward', description: 'Shields clients from financial harm' },
      { archetype: 'Sage/Mentor', label: 'The long-term planning guide', description: 'Develops clients\' financial potential' },
      { archetype: 'Sovereign/Ambassador', label: 'The trusted representative', description: 'Manages client relationships diplomatically' },
    ]},
    { role: 'Quant', variants: [
      { archetype: 'Magician/Scientist', label: 'The model builder', description: 'Discovers through systematic experimentation' },
      { archetype: 'Sage/Detective', label: 'The pattern hunter', description: 'Investigative analysis of complex data' },
      { archetype: 'Magician/Engineer', label: 'The systems designer', description: 'Builds the quantitative infrastructure' },
    ]},
  ],
  Sales: [
    { role: 'Account Executive', variants: [
      { archetype: 'Hero/Warrior', label: 'The competitive closer', description: 'Disciplined pursuit of targets, mission-focused deal execution' },
      { archetype: 'Magician/Innovator', label: 'The consultative seller', description: 'Transforms client problems into tailored solutions' },
      { archetype: 'Explorer/Adventurer', label: 'The hunter', description: 'Thrives in new territory, energised by the pursuit' },
    ]},
    { role: 'Sales Development', variants: [
      { archetype: 'Explorer/Pioneer', label: 'The territory builder', description: 'Opens new markets and builds pipeline from scratch' },
      { archetype: 'Everyman/Networker', label: 'The relationship builder', description: 'Connects naturally, builds rapport at scale' },
      { archetype: 'Hero/Athlete', label: 'The metrics-driven prospector', description: 'Relentless activity, pushes personal performance limits' },
    ]},
    { role: 'Sales Engineer', variants: [
      { archetype: 'Sage/Translator', label: 'The technical storyteller', description: 'Makes complex solutions accessible to any audience' },
      { archetype: 'Magician/Engineer', label: 'The demo architect', description: 'Builds compelling technical demonstrations and proofs of concept' },
      { archetype: 'Explorer/Generalist', label: 'The solutions consultant', description: 'Bridges technical depth with business understanding' },
    ]},
    { role: 'Customer Success', variants: [
      { archetype: 'Caregiver/Guardian', label: 'The account protector', description: 'Shields the relationship, prevents churn through vigilance' },
      { archetype: 'Sovereign/Ambassador', label: 'The strategic partner', description: 'Represents the client internally, builds executive alignment' },
      { archetype: 'Everyman/Advocate', label: 'The customer champion', description: 'Speaks for the customer, bridges power gaps with the vendor' },
    ]},
    { role: 'Business Development', variants: [
      { archetype: 'Creator/Entrepreneur', label: 'The deal architect', description: 'Creates new business models and partnership structures' },
      { archetype: 'Explorer/Pioneer', label: 'The market opener', description: 'Pushes into uncharted territory, finds untapped opportunities' },
      { archetype: 'Sovereign/Ambassador', label: 'The partnership builder', description: 'Navigates complex stakeholder landscapes diplomatically' },
    ]},
  ],
  Coaching: [
    { role: 'Life Coach', variants: [
      { archetype: 'Sage/Mentor', label: 'The wisdom guide', description: 'Develops potential through deep accumulated life experience' },
      { archetype: 'Caregiver/Healer', label: 'The transformative supporter', description: 'Helps clients heal patterns and build new foundations' },
      { archetype: 'Innocent/Idealist', label: 'The possibility coach', description: 'Believes in untapped potential, inspires through optimism' },
    ]},
    { role: 'Therapist', variants: [
      { archetype: 'Sage/Shaman', label: 'The depth practitioner', description: 'Accesses deep patterns beneath the surface, intuitive insight' },
      { archetype: 'Caregiver/Angel', label: 'The unconditional space-holder', description: 'Creates safety without judgment, holds space for healing' },
      { archetype: 'Magician/Alchemist', label: 'The pattern transformer', description: 'Transmutes destructive patterns into growth through subtle intervention' },
    ]},
    { role: 'Career Coach', variants: [
      { archetype: 'Sage/Mentor', label: 'The career navigator', description: 'Guides professional development through accumulated wisdom' },
      { archetype: 'Explorer/Generalist', label: 'The possibilities explorer', description: 'Helps clients discover paths they had not considered' },
      { archetype: 'Rebel/Reformer', label: 'The convention challenger', description: 'Questions career assumptions, helps clients break free of scripts' },
    ]},
    { role: 'Wellness Coach', variants: [
      { archetype: 'Caregiver/Healer', label: 'The holistic guide', description: 'Addresses mind, body, and spirit as an integrated system' },
      { archetype: 'Innocent/Dreamer', label: 'The mindful companion', description: 'Gentle presence, helps clients reconnect with inner calm' },
      { archetype: 'Explorer/Seeker', label: 'The mindful explorer', description: 'Questions assumptions about health, seeks deeper understanding' },
    ]},
    { role: 'Relationship Coach', variants: [
      { archetype: 'Lover/Matchmaker', label: 'The connection architect', description: 'Builds bridges between people, understands relational dynamics' },
      { archetype: 'Sage/Shaman', label: 'The pattern reader', description: 'Sees relational dynamics beneath the surface' },
      { archetype: 'Lover/Companion', label: 'The steady presence', description: 'Models healthy attachment through consistent, warm engagement' },
    ]},
  ],
  Marketing: [
    { role: 'Content Strategist', variants: [
      { archetype: 'Creator/Storyteller', label: 'The narrative architect', description: 'Crafts compelling stories that connect brand to audience' },
      { archetype: 'Sage/Translator', label: 'The clarity maker', description: 'Distils complex ideas into accessible, resonant messaging' },
      { archetype: 'Creator/Visionary', label: 'The thought leader', description: 'Shapes category narratives and future-facing content' },
    ]},
    { role: 'Brand Strategist', variants: [
      { archetype: 'Magician/Alchemist', label: 'The brand alchemist', description: 'Transforms raw brand elements into coherent identity' },
      { archetype: 'Creator/Visionary', label: 'The brand visionary', description: 'Sees the future shape of the brand before others' },
      { archetype: 'Rebel/Activist', label: 'The challenger brand builder', description: 'Positions against convention, builds brands that provoke' },
    ]},
    { role: 'Community Manager', variants: [
      { archetype: 'Everyman/Networker', label: 'The community weaver', description: 'Connects people naturally, builds belonging at scale' },
      { archetype: 'Lover/Companion', label: 'The community anchor', description: 'Steady warmth that makes people feel at home' },
      { archetype: 'Jester/Entertainer', label: 'The community energiser', description: 'Keeps the community alive with humour, events, and energy' },
    ]},
    { role: 'Growth Marketer', variants: [
      { archetype: 'Rebel/Gambler', label: 'The growth hacker', description: 'High-stakes experimentation, embraces unconventional channels' },
      { archetype: 'Magician/Scientist', label: 'The experiment runner', description: 'Systematic A/B testing and data-driven optimisation' },
      { archetype: 'Explorer/Adventurer', label: 'The channel explorer', description: 'Discovers untapped channels and first-mover advantages' },
    ]},
  ],
};

export const PROFESSION_LIST = Object.keys(PROFESSION_PRESETS).sort();
