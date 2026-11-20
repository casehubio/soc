export interface TooltipEntry {
  tip: string;
  detail: string;
}

export const FRAMEWORK_TOOLTIPS: Record<string, TooltipEntry> = {
  // Framework names
  'MBTI': {
    tip: 'Myers-Briggs personality type — 16 types based on four cognitive preference pairs.',
    detail: 'The Myers-Briggs Type Indicator classifies personality along four axes: Introversion/Extraversion (energy source), Sensing/Intuition (information gathering), Thinking/Feeling (decision making), and Judging/Perceiving (lifestyle orientation). Each combination produces one of 16 types. In work contexts, MBTI helps predict communication style, decision-making approach, and team dynamics. The types describe preferences, not abilities — an INTJ can socialise and an ESFP can focus alone, but each draws energy differently.',
  },
  'Enneagram': {
    tip: 'Nine personality types based on core motivations and fears.',
    detail: 'The Enneagram describes nine interconnected personality types, each driven by a core motivation and a core fear. Unlike trait-based models, it focuses on why people behave as they do rather than how. Type 1 fears being corrupt, Type 5 fears being helpless, Type 8 fears being controlled. Each type has healthy, average, and unhealthy expressions. In professional settings, the Enneagram reveals what drives engagement, what triggers stress, and how people respond under pressure.',
  },
  'DISC': {
    tip: 'Four behavioural styles — Dominance, Influence, Steadiness, Conscientiousness.',
    detail: 'DISC measures observable behaviour across two axes: pace (fast vs. measured) and focus (task vs. people). D types are direct and results-driven. I types are enthusiastic and collaborative. S types are patient and supportive. C types are precise and analytical. Most people lead with one or two styles. DISC is widely used in workplace communication because it describes how people act rather than why — making it practical for adapting communication style to your audience.',
  },
  'Belbin': {
    tip: 'Nine team roles describing how people contribute to group work.',
    detail: 'Belbin Team Roles identify nine clusters of behaviour that emerge in team settings. Each person typically has a primary role (strongest contribution), one or two secondary roles, and roles they avoid. The nine roles span three categories: thinking roles (Plant, Monitor Evaluator, Specialist), action roles (Shaper, Implementer, Completer-Finisher), and people roles (Co-ordinator, Teamworker, Resource Investigator). Balanced teams need coverage across all three categories.',
  },
  'SDI': {
    tip: 'Strength Deployment Inventory — motivational values driving behaviour.',
    detail: 'The SDI (Strength Deployment Inventory) maps three core motives: concern for people (Blue), concern for performance (Red), and concern for process (Green). Hub blends all three. Unlike behavioural models, SDI focuses on what people value and why they deploy their strengths. Crucially, SDI tracks how motives shift under conflict — a Blue (altruistic) person may shift to Red (assertive) when their values are threatened. This makes it particularly useful for understanding team friction.',
  },
  'Big Five': {
    tip: 'Five broad personality dimensions backed by extensive research.',
    detail: 'The Big Five (OCEAN) is the most empirically validated personality model. It measures Openness to experience, Conscientiousness, Extraversion, Agreeableness, and Neuroticism (emotional reactivity). Each dimension is a spectrum, not a binary. High Openness correlates with creativity and adaptability; high Conscientiousness with reliability and follow-through; high Extraversion with energy in social settings; high Agreeableness with cooperation; low Neuroticism with emotional stability under pressure.',
  },

  // MBTI types
  'MBTI:INTJ': {
    tip: 'The Architect — strategic, independent, driven by competence.',
    detail: 'INTJs combine long-range vision with analytical rigour. They see systems and patterns, build mental models, and work relentlessly to improve them. In teams, they contribute strategic thinking and high standards but may struggle with small talk and consensus-building. They prefer written communication, value competence over credentials, and become frustrated by inefficiency or illogical processes.',
  },
  'MBTI:INTP': {
    tip: 'The Logician — curious, analytical, loves theoretical problems.',
    detail: 'INTPs are driven by understanding how things work at a fundamental level. They excel at finding logical inconsistencies, building frameworks, and exploring possibilities. In work settings, they contribute deep analysis and novel approaches but may resist structure and deadlines. They think by talking through ideas, value precision in language, and are energised by intellectual challenge.',
  },
  'MBTI:ENTJ': {
    tip: 'The Commander — decisive, ambitious, natural organiser.',
    detail: 'ENTJs see inefficiency as a personal challenge. They naturally organise people, systems, and processes toward goals. In teams, they drive execution, make quick decisions, and hold people accountable. They can be perceived as blunt or impatient, but their directness often accelerates progress. They value strategic thinking and become frustrated by indecision or lack of follow-through.',
  },
  'MBTI:ENTP': {
    tip: 'The Debater — inventive, strategic, challenges assumptions.',
    detail: 'ENTPs thrive on intellectual exploration and debate. They generate ideas rapidly, see connections others miss, and enjoy dismantling conventional thinking. In teams, they contribute innovation and creative problem-solving but may start more projects than they finish. They are energised by brainstorming, value intellectual freedom, and resist routine or bureaucracy.',
  },
  'MBTI:INFJ': {
    tip: 'The Advocate — insightful, principled, quietly influential.',
    detail: 'INFJs combine deep intuition about people with a drive to create meaningful change. They see potential in individuals and systems, and work persistently toward their vision. In teams, they contribute empathy, strategic insight, and moral clarity, but need time alone to process. They are energised by purposeful work and frustrated by superficiality or ethical compromise.',
  },
  'MBTI:INFP': {
    tip: 'The Mediator — idealistic, empathetic, values authenticity.',
    detail: 'INFPs are guided by deeply held values and a vision of how things could be. They bring creativity, empathy, and genuine care to their work. In teams, they contribute emotional intelligence and original thinking but may avoid confrontation. They are energised by meaningful work aligned with their values and frustrated by environments that feel inauthentic.',
  },
  'MBTI:ENFJ': {
    tip: 'The Protagonist — charismatic, empathetic, natural mentor.',
    detail: 'ENFJs are driven to help others grow and reach their potential. They read group dynamics intuitively, build consensus, and inspire action. In teams, they contribute warmth, vision, and strong communication, but may overextend themselves caring for others. They are energised by collaborative achievement and frustrated by apathy or interpersonal conflict.',
  },
  'MBTI:ENFP': {
    tip: 'The Campaigner — enthusiastic, creative, sees possibilities everywhere.',
    detail: 'ENFPs bring infectious energy and a talent for connecting ideas and people. They see potential everywhere, generate enthusiasm for new directions, and champion causes they believe in. In teams, they contribute creativity, warmth, and adaptability, but may resist detailed follow-through. They thrive in dynamic environments and struggle with rigid processes.',
  },
  'MBTI:ISTJ': {
    tip: 'The Logistician — dependable, thorough, respects procedure.',
    detail: 'ISTJs are the backbone of reliable execution. They follow through on commitments, maintain standards, and build systems that work consistently. In teams, they contribute thoroughness, institutional memory, and steady output, but may resist untested changes. They value clear expectations, documented processes, and demonstrable competence.',
  },
  'MBTI:ISFJ': {
    tip: 'The Defender — loyal, attentive, quietly supportive.',
    detail: 'ISFJs combine meticulous attention to detail with genuine care for people. They remember what matters to others, maintain team harmony, and handle essential tasks without seeking recognition. In teams, they contribute stability, practical support, and institutional knowledge. They are energised by helping others succeed and frustrated by carelessness or broken commitments.',
  },
  'MBTI:ESTJ': {
    tip: 'The Executive — organised, direct, drives accountability.',
    detail: 'ESTJs bring order, structure, and clear expectations to any environment. They organise workflows, enforce standards, and ensure deadlines are met. In teams, they contribute decisive leadership and operational excellence, but may be perceived as rigid. They value tradition, clear authority, and measurable results.',
  },
  'MBTI:ESFJ': {
    tip: 'The Consul — warm, sociable, community-oriented.',
    detail: 'ESFJs create welcoming, well-organised environments where people feel valued. They are attuned to social dynamics, remember personal details, and actively maintain team cohesion. In teams, they contribute interpersonal warmth, practical organisation, and conflict resolution. They are energised by harmonious collaboration and troubled by discord or exclusion.',
  },
  'MBTI:ISTP': {
    tip: 'The Virtuoso — practical, adaptable, hands-on problem solver.',
    detail: 'ISTPs understand how things work by taking them apart. They are calm under pressure, practical in crisis, and skilled at improvising solutions with available resources. In teams, they contribute technical competence and cool-headed troubleshooting, but may disengage from politics or lengthy meetings. They value autonomy and hands-on experience.',
  },
  'MBTI:ISFP': {
    tip: 'The Adventurer — artistic, gentle, lives in the moment.',
    detail: 'ISFPs bring aesthetic sensitivity and quiet authenticity to their work. They notice details others miss, create harmonious environments, and express values through action rather than words. In teams, they contribute creativity, flexibility, and genuine presence. They are energised by beauty and personal expression, and withdraw from environments that feel impersonal.',
  },
  'MBTI:ESTP': {
    tip: 'The Entrepreneur — bold, perceptive, thrives on action.',
    detail: 'ESTPs are energised by doing. They read situations quickly, take calculated risks, and adapt in real time. In teams, they contribute decisive action, practical solutions, and an ability to cut through analysis paralysis. They can be impatient with theory or long planning cycles. They value direct experience and tangible results.',
  },
  'MBTI:ESFP': {
    tip: 'The Entertainer — spontaneous, energetic, people-oriented.',
    detail: 'ESFPs bring warmth, humour, and positive energy to any setting. They are naturally attuned to the mood of a room and skilled at making others comfortable. In teams, they contribute enthusiasm, adaptability, and the ability to defuse tension. They learn by doing, value experiences over abstractions, and thrive in dynamic environments.',
  },

  // Enneagram types
  'Enneagram:Type 1': {
    tip: 'The Reformer — principled, purposeful, self-controlled.',
    detail: 'Type 1s are motivated by a desire to be good, right, and ethical. They hold themselves and others to high standards, and are driven to improve what they see as flawed. At their best, they are wise, discerning, and inspiring moral leaders. Under stress, they become critical, rigid, and resentful. In work settings, they bring integrity, quality standards, and methodical improvement.',
  },
  'Enneagram:Type 2': {
    tip: 'The Helper — generous, people-pleasing, relationship-focused.',
    detail: 'Type 2s are motivated by a need to be loved and needed. They intuitively sense what others need and provide support, sometimes at the expense of their own needs. At their best, they are genuinely altruistic and deeply empathetic. Under stress, they become possessive and resentful when unappreciated. In teams, they build strong relationships and create supportive environments.',
  },
  'Enneagram:Type 3': {
    tip: 'The Achiever — success-oriented, adaptable, image-conscious.',
    detail: 'Type 3s are motivated by a desire to be valuable and worthwhile through achievement. They are efficient, goal-oriented, and skilled at presenting themselves well. At their best, they inspire others through authentic accomplishment. Under stress, they become overly competitive and may prioritise image over substance. In work settings, they drive results and model high performance.',
  },
  'Enneagram:Type 4': {
    tip: 'The Individualist — expressive, dramatic, temperamental.',
    detail: 'Type 4s are motivated by a desire to find significance and express their authentic identity. They are deeply attuned to beauty, meaning, and emotional truth. At their best, they bring profound creativity and emotional depth. Under stress, they become self-absorbed and envious. In creative work, they contribute originality, aesthetic sensitivity, and willingness to explore difficult territory.',
  },
  'Enneagram:Type 5': {
    tip: 'The Investigator — cerebral, perceptive, self-sufficient.',
    detail: 'Type 5s are motivated by a need to understand the world and conserve their energy. They observe carefully, analyse deeply, and build expertise in focused domains. At their best, they are visionary pioneers who see what others cannot. Under stress, they become detached, hoarding knowledge and retreating from demands. In teams, they contribute deep expertise, objective analysis, and innovative thinking.',
  },
  'Enneagram:Type 6': {
    tip: 'The Loyalist — responsible, anxious, security-oriented.',
    detail: 'Type 6s are motivated by a need for security and support. They anticipate problems, test loyalty, and prepare for worst-case scenarios. At their best, they are courageous, community-minded, and deeply committed. Under stress, they become suspicious and indecisive. In work settings, they bring risk awareness, thoroughness, and steadfast commitment to the team.',
  },
  'Enneagram:Type 7': {
    tip: 'The Enthusiast — spontaneous, versatile, acquisitive.',
    detail: 'Type 7s are motivated by a desire to maintain freedom and happiness while avoiding pain. They generate ideas rapidly, connect disparate concepts, and bring infectious optimism. At their best, they are joyful, grateful, and deeply present. Under stress, they become scattered and escapist. In teams, they contribute creative energy, adaptability, and the ability to reframe setbacks as opportunities.',
  },
  'Enneagram:Type 8': {
    tip: 'The Challenger — powerful, dominating, self-confident.',
    detail: 'Type 8s are motivated by a need to be strong and avoid vulnerability. They are direct, decisive, and protective of those in their care. At their best, they are magnanimous leaders who empower others. Under stress, they become controlling and confrontational. In work settings, they bring decisive action, strength under pressure, and willingness to make hard calls.',
  },
  'Enneagram:Type 9': {
    tip: 'The Peacemaker — receptive, reassuring, agreeable.',
    detail: 'Type 9s are motivated by a desire for inner and outer peace. They see all perspectives, mediate conflict, and create inclusive environments. At their best, they are deeply connected, accepting, and able to unite diverse groups. Under stress, they become passive, disengaged, and stubborn in their inaction. In teams, they contribute harmony, inclusiveness, and the ability to find common ground.',
  },

  // DISC styles
  'DISC:D': {
    tip: 'Dominance — direct, decisive, competitive, results-focused.',
    detail: 'D-style individuals are fast-paced and task-oriented. They focus on results, make quick decisions, and take charge of situations. They communicate bluntly, value efficiency, and become impatient with excessive detail or process. They are most effective when given autonomy and clear goals. Under pressure, they may become aggressive or dismissive of others\' input.',
  },
  'DISC:I': {
    tip: 'Influence — enthusiastic, optimistic, collaborative, people-focused.',
    detail: 'I-style individuals are fast-paced and people-oriented. They build relationships easily, generate enthusiasm, and thrive in collaborative settings. They communicate expressively, value recognition, and become restless with isolation or rigid structure. They are most effective in dynamic, social environments. Under pressure, they may become disorganised or overly emotional.',
  },
  'DISC:S': {
    tip: 'Steadiness — patient, reliable, team-oriented, consistent.',
    detail: 'S-style individuals are measured and people-oriented. They provide steady, dependable support, maintain team harmony, and prefer predictable environments. They communicate warmly, value security, and become stressed by sudden change or conflict. They are most effective in stable, collaborative settings. Under pressure, they may become passive or resistant to change.',
  },
  'DISC:C': {
    tip: 'Conscientiousness — analytical, precise, quality-focused, systematic.',
    detail: 'C-style individuals are measured and task-oriented. They focus on accuracy, follow procedures, and maintain high standards. They communicate formally, value correctness, and become frustrated by sloppy work or arbitrary decisions. They are most effective when given time to analyse and verify. Under pressure, they may over-analyse or become critical.',
  },

  // Belbin roles
  'Belbin:Plant': {
    tip: 'Creative innovator — generates original ideas and novel solutions.',
    detail: 'Plants are the team\'s source of original ideas. They think unconventionally, make unexpected connections, and propose creative solutions to difficult problems. Their weakness is that they may ignore practical constraints or be too absorbed in their ideas to communicate them effectively. They work best when given freedom to think and their ideas are filtered by others for feasibility.',
  },
  'Belbin:Shaper': {
    tip: 'Driven challenger — pushes the team to overcome obstacles.',
    detail: 'Shapers are dynamic, driven individuals who thrive under pressure and push the team to deliver. They challenge complacency, find ways around obstacles, and maintain momentum. Their weakness is that they can be provocative, impatient, and prone to offending others. They are essential when deadlines are tight and the team needs urgency.',
  },
  'Belbin:Monitor Evaluator': {
    tip: 'Strategic critic — analyses options with objective judgement.',
    detail: 'Monitor Evaluators bring sober, impartial analysis to team decisions. They weigh options carefully, spot flaws in plans, and make accurate judgements. Their weakness is that they can be overly critical and slow to commit. They are essential when the team faces complex decisions with significant consequences and needs someone who won\'t be swayed by enthusiasm alone.',
  },
  'Belbin:Co-ordinator': {
    tip: 'Mature leader — clarifies goals and delegates effectively.',
    detail: 'Co-ordinators draw out contributions from all team members, clarify objectives, and delegate work based on individual strengths. They are calm, confident, and focused on the big picture. Their weakness is that they may be perceived as manipulative or as offloading their own work. They are essential in diverse teams that need structure without autocracy.',
  },
  'Belbin:Teamworker': {
    tip: 'Diplomatic supporter — builds cohesion and resolves friction.',
    detail: 'Teamworkers are perceptive, diplomatic individuals who listen well and smooth over interpersonal friction. They build team spirit, support others, and are flexible about their own role. Their weakness is indecisiveness under pressure and a tendency to avoid confrontation. They are essential when team morale is low or interpersonal tensions threaten progress.',
  },
  'Belbin:Implementer': {
    tip: 'Practical organiser — turns ideas into manageable action plans.',
    detail: 'Implementers convert concepts and plans into practical, working procedures. They are disciplined, reliable, and efficient at systematic work. Their weakness is inflexibility and resistance to unproven ideas. They are essential when the team has good ideas but struggles to execute — Implementers bridge the gap between thinking and doing.',
  },
  'Belbin:Completer-Finisher': {
    tip: 'Quality perfectionist — ensures thoroughness and catches errors.',
    detail: 'Completer-Finishers have an exceptional eye for detail and a drive to deliver polished, error-free work. They maintain high standards, check for mistakes, and ensure nothing is overlooked. Their weakness is that they worry excessively, find it hard to delegate, and may slow the team down. They are essential in quality-critical work where errors have serious consequences.',
  },
  'Belbin:Specialist': {
    tip: 'Deep expert — contributes rare, in-depth knowledge.',
    detail: 'Specialists provide expert knowledge and technical skills in a focused area. They are self-starting, dedicated, and committed to maintaining professional standards in their domain. Their weakness is a narrow focus — they contribute on a limited front and may dwell on technicalities. They are essential when the team needs deep expertise that no generalist can provide.',
  },
  'Belbin:Resource Investigator': {
    tip: 'Networker — explores opportunities and develops external contacts.',
    detail: 'Resource Investigators are enthusiastic, outgoing team members who explore opportunities, develop contacts, and negotiate for resources. They bring back ideas and information from outside the team. Their weakness is that they lose interest quickly after the initial enthusiasm fades. They are essential in the early stages of a project when the team needs to explore possibilities and build external relationships.',
  },

  // SDI values
  'SDI:Blue': {
    tip: 'Altruistic-nurturing — motivated by helping others and building relationships.',
    detail: 'Blue SDI individuals are driven by concern for the welfare of others. They seek to protect, nurture, and develop people. They are most fulfilled when their work helps others grow or when they can create trusting relationships. Under conflict, they may initially accommodate, but can become fiercely assertive when core values around care and fairness are violated.',
  },
  'SDI:Red': {
    tip: 'Assertive-directing — motivated by results, leadership, and challenge.',
    detail: 'Red SDI individuals are driven by performance, achievement, and taking charge. They seek challenges, set ambitious goals, and act decisively. They are most fulfilled when they can influence outcomes directly. Under conflict, they confront issues head-on and may become competitive or domineering. They respect competence and directness in others.',
  },
  'SDI:Green': {
    tip: 'Analytical-autonomising — motivated by logic, process, and understanding.',
    detail: 'Green SDI individuals are driven by a need to understand, organise, and ensure things are done correctly. They value thoughtful analysis, fair processes, and self-sufficiency. They are most fulfilled when they can work methodically toward well-reasoned outcomes. Under conflict, they may withdraw to analyse the situation, and can become stubbornly principled.',
  },
  'SDI:Hub': {
    tip: 'Flexible-cohering — blends all three motives depending on context.',
    detail: 'Hub SDI individuals are motivated by flexibility and cohesion. They draw on altruistic (Blue), assertive (Red), and analytical (Green) motives as the situation demands. They are natural mediators who see multiple perspectives. They are most fulfilled in roles that require versatility. Under conflict, they may initially try to find a flexible solution but can feel pulled in multiple directions.',
  },

  // Big Five poles
  'Big Five:High O': {
    tip: 'Open to experience — curious, imaginative, embraces novelty.',
    detail: 'High Openness individuals are drawn to new ideas, creative expression, and unconventional approaches. They enjoy abstract thinking, are intellectually curious, and adapt readily to change. In work settings, they contribute innovation and flexibility but may resist routine or become bored with repetitive tasks.',
  },
  'Big Five:Low O': {
    tip: 'Practical and conventional — prefers the familiar and proven.',
    detail: 'Low Openness individuals prefer concrete, practical approaches over abstract theory. They value tradition, consistency, and proven methods. In work settings, they contribute stability and reliability but may resist change or dismiss unconventional ideas too quickly.',
  },
  'Big Five:High C': {
    tip: 'Conscientious — organised, disciplined, goal-directed.',
    detail: 'High Conscientiousness individuals are systematic, dependable, and driven to achieve. They plan ahead, follow through on commitments, and maintain high standards. In work settings, they contribute reliability and quality but may become rigid or overly focused on details.',
  },
  'Big Five:Low C': {
    tip: 'Flexible and spontaneous — adaptable but less structured.',
    detail: 'Low Conscientiousness individuals are flexible, spontaneous, and comfortable with ambiguity. They adapt quickly and can pivot without distress. In work settings, they contribute adaptability and creative freedom but may struggle with deadlines, follow-through, or detailed planning.',
  },
  'Big Five:High E': {
    tip: 'Extraverted — energetic, talkative, draws energy from others.',
    detail: 'High Extraversion individuals are energised by social interaction, assertive in groups, and comfortable being the centre of attention. They think by talking, build broad networks, and maintain high energy. In work settings, they contribute enthusiasm and social drive but may dominate conversations or struggle with solitary deep work.',
  },
  'Big Five:Low E': {
    tip: 'Introverted — reserved, reflective, draws energy from solitude.',
    detail: 'Low Extraversion individuals are reflective, reserved, and energised by time alone. They think before speaking, build deep rather than broad relationships, and prefer focused work to group activities. In work settings, they contribute thoughtful analysis and deep focus but may be overlooked in group settings or perceived as aloof.',
  },
  'Big Five:High A': {
    tip: 'Agreeable — cooperative, trusting, values harmony.',
    detail: 'High Agreeableness individuals are warm, cooperative, and motivated to maintain positive relationships. They trust others, avoid conflict, and prioritise group harmony. In work settings, they contribute team cohesion and collaboration but may avoid necessary confrontation or defer too readily to others.',
  },
  'Big Five:Low A': {
    tip: 'Challenging — competitive, sceptical, prioritises truth over tact.',
    detail: 'Low Agreeableness individuals are direct, competitive, and willing to challenge others. They prioritise accuracy over harmony and are comfortable with disagreement. In work settings, they contribute honest feedback and rigorous debate but may create friction or be perceived as abrasive.',
  },
  'Big Five:High N': {
    tip: 'Emotionally reactive — sensitive to stress, experiences feelings intensely.',
    detail: 'High Neuroticism individuals experience emotions intensely and are more sensitive to stress, criticism, and setbacks. They may anticipate problems that others miss. In work settings, they can contribute heightened awareness of risks and emotional nuance but may need more support during high-pressure periods.',
  },
  'Big Five:Low N': {
    tip: 'Emotionally stable — calm under pressure, even-tempered.',
    detail: 'Low Neuroticism individuals remain calm and composed under stress. They recover quickly from setbacks and maintain steady emotional equilibrium. In work settings, they contribute stability and resilience under pressure but may underestimate the emotional impact of situations on others.',
  },
};
