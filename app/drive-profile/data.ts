// Drive Profile — an original, DISC-structure-inspired motivation assessment.
// Four styles, forced-choice tetrad questions ("most like me" / "least like
// me"), scored the standard way: +1 to the chosen "most" style, -1 to the
// chosen "least" style, net across every question. This is original content
// (framework, wording, and scoring are our own) — not the licensed DISC
// assessment.

export type StyleKey = 'driver' | 'connector' | 'anchor' | 'strategist';

export interface StyleInfo {
  key: StyleKey;
  label: string;
  emoji: string;
  color: string;
  colorSoft: string;
  gradient: string;
  tagline: string;
  affirmation: string;
  blendTrait: string;
  coreMotivators: string[];
  howToMakeItWork: string[];
  watchFor: string[];
  idealEnvironment: string;
  underPressure: string;
  communicationTips: string;
}

export const STYLES: Record<StyleKey, StyleInfo> = {
  driver: {
    key: 'driver',
    label: 'Driver',
    emoji: '🔥',
    color: '#DC2626',
    colorSoft: '#FEE2E2',
    gradient: 'linear-gradient(135deg,#DC2626,#F97316)',
    tagline: "You're motivated by winning, moving fast, and getting real results.",
    affirmation: 'I turn decisions into action.',
    blendTrait: 'urgency and directness',
    coreMotivators: [
      'Clear goals and the freedom to chase them your own way',
      'Competition — against others, or against your own best time',
      'Visible results you can point to',
      'Being trusted to make the call',
      "New challenges that keep things from feeling routine",
    ],
    howToMakeItWork: [
      "Ask for outcomes, not step-by-step instructions — you do your best work with room to run",
      "Build quick wins into long projects so they don't feel like a slog",
      "Remember you think out loud fast — not every first reaction has to be your final answer",
      "Pair up with someone detail-oriented for the parts you'd rather skip",
      "Schedule real recovery time — your pace burns hot and needs a deliberate cool-down",
    ],
    watchFor: [
      'Steamrolling quieter voices before they’ve finished a thought',
      "Losing patience with process that feels like it's slowing you down",
      "Coming across as blunt when you're actually just being efficient",
    ],
    idealEnvironment:
      "Fast-moving, results-focused, and light on unnecessary process — you thrive where your output speaks for itself and nobody's slowing you down with rules for their own sake.",
    underPressure: 'You speed up, get shorter and more direct, and want the obstacle gone now — not analyzed.',
    communicationTips: 'Lead with the bottom line. Skip the preamble. Give the headline first, details only if asked.',
  },
  connector: {
    key: 'connector',
    label: 'Connector',
    emoji: '🌟',
    color: '#D97706',
    colorSoft: '#FEF3C7',
    gradient: 'linear-gradient(135deg,#F59E0B,#EC4899)',
    tagline: "You're motivated by people, recognition, and energy in the room.",
    affirmation: 'I bring people together and lift the room.',
    blendTrait: 'warmth and enthusiasm',
    coreMotivators: [
      'Being genuinely liked and remembered',
      'A lively, social environment — not a quiet cubicle',
      "Public recognition for what you've contributed",
      'Variety — new people, new ideas, new energy',
      'Freedom to talk things through out loud',
    ],
    howToMakeItWork: [
      "Say out loud that you process by talking — it stops people mistaking your thinking-out-loud for a final decision",
      "Build accountability into your goals (a partner, a public commitment) since deadlines alone don't always stick",
      'Pair with someone detail-oriented to catch what enthusiasm skips over',
      "Ask directly for recognition when you've earned it — it's not vanity, it's fuel",
      "Protect time for follow-through, not just kickoff — your energy is real, structure makes it stick",
    ],
    watchFor: [
      'Overpromising in the excitement of the moment',
      'Skipping details that feel boring but matter',
      'Taking quiet or critical feedback more personally than it was meant',
    ],
    idealEnvironment:
      'Social, energetic, full of people and variety — you fade in isolated, heads-down work and come alive around a team.',
    underPressure: 'You get talkative, a little scattered, and look for someone to process out loud with.',
    communicationTips: "Warm it up before getting to business. Let them talk it through — that's how they think, not a delay tactic.",
  },
  anchor: {
    key: 'anchor',
    label: 'Anchor',
    emoji: '🌿',
    color: '#059669',
    colorSoft: '#D1FAE5',
    gradient: 'linear-gradient(135deg,#059669,#0D9488)',
    tagline: "You're motivated by stability, appreciation, and genuinely helping people.",
    affirmation: "I'm the steady presence people can count on.",
    blendTrait: 'patience and steadiness',
    coreMotivators: [
      'A calm, predictable environment',
      'Being appreciated for quiet, consistent effort — not just the flashy wins',
      'Real relationships built on trust over time',
      "Harmony — knowing the people around you are okay",
      "Clear expectations that don't shift constantly",
    ],
    howToMakeItWork: [
      "Give yourself permission to say no — you don't have to absorb everyone else's overflow",
      'Ask for a heads-up before big changes — you do your best work with time to adjust',
      'Practice naming disagreement early and small, before it piles up into something big',
      'Let people know you need real appreciation, not just "good job" — specifics land better',
      'Build in transition time between tasks instead of hard-switching',
    ],
    watchFor: [
      "Staying quiet about a problem until it's already a bigger one",
      "Resisting change even when it's genuinely for the better",
      'Taking on too much because saying no feels uncomfortable',
    ],
    idealEnvironment:
      "Stable, low-conflict, and team-oriented — you do your best work when the ground isn't constantly shifting and people notice your consistency.",
    underPressure: "You go quiet, withdraw a little, and need space before you're ready to talk it through.",
    communicationTips: 'Give them time to process before expecting an answer. Reassure, don’t rush — pressure makes them shut down, not speed up.',
  },
  strategist: {
    key: 'strategist',
    label: 'Strategist',
    emoji: '🧭',
    color: '#2563EB',
    colorSoft: '#DBEAFE',
    gradient: 'linear-gradient(135deg,#2563EB,#7C3AED)',
    tagline: "You're motivated by accuracy, expertise, and doing it right.",
    affirmation: 'I make sure it’s done right.',
    blendTrait: 'precision and careful thinking',
    coreMotivators: [
      "Getting it correct — not just done",
      'Clear standards and logical, well-explained expectations',
      'Being seen as knowledgeable and precise',
      'Time to think it through before committing',
      'Systems and processes that actually make sense',
    ],
    howToMakeItWork: [
      "Ask for the \"why\" behind a decision — once the logic makes sense, you're all in",
      'Set yourself a deadline for "good enough" research, or perfect can quietly become the enemy of done',
      'Warn people up front that you need processing time — it reads as thorough, not slow, once they know that’s just how you work',
      'Pair with someone big-picture and fast-moving to help you know when to stop refining',
      "Ask directly for detailed feedback — vague praise doesn't actually tell you anything useful",
    ],
    watchFor: [
      'Getting stuck perfecting something past the point it needed',
      "Coming across as overly critical when you're just being precise",
      "Withholding an opinion until you're 100% sure, even when \"pretty sure\" was enough",
    ],
    idealEnvironment:
      'Structured, logical, and low on ambiguity — you do your best work with clear standards, real data, and time to think things through properly.',
    underPressure: 'You get quiet, more critical, and want to double-check everything before moving forward.',
    communicationTips: "Bring data, not just opinions. Give them time to think before asking for a snap answer — and don't mistake their questions for doubt in you, it's just how they get comfortable.",
  },
};

export const STYLE_ORDER: StyleKey[] = ['driver', 'connector', 'anchor', 'strategist'];

export interface Question {
  id: number;
  prompt: string;
  options: { style: StyleKey; text: string }[];
}

export const QUESTIONS: Question[] = [
  {
    id: 1,
    prompt: 'Under pressure, I tend to:',
    options: [
      { style: 'driver', text: 'Take charge immediately' },
      { style: 'strategist', text: 'Analyze the problem first' },
      { style: 'connector', text: 'Rally others for support' },
      { style: 'anchor', text: 'Stay calm and steady' },
    ],
  },
  {
    id: 2,
    prompt: 'I feel most energized when:',
    options: [
      { style: 'connector', text: 'Meeting new people' },
      { style: 'driver', text: 'Winning a competition' },
      { style: 'strategist', text: 'Solving a tricky problem' },
      { style: 'anchor', text: 'Helping someone in need' },
    ],
  },
  {
    id: 3,
    prompt: 'My natural pace is:',
    options: [
      { style: 'anchor', text: 'Steady and unhurried' },
      { style: 'driver', text: 'Fast and urgent' },
      { style: 'strategist', text: 'Careful and deliberate' },
      { style: 'connector', text: 'Enthusiastic and spontaneous' },
    ],
  },
  {
    id: 4,
    prompt: "In a group project, I usually:",
    options: [
      { style: 'strategist', text: "Check that the details are right" },
      { style: 'connector', text: 'Keep everyone motivated' },
      { style: 'driver', text: 'Take the lead' },
      { style: 'anchor', text: "Make sure everyone's heard" },
    ],
  },
  {
    id: 5,
    prompt: 'When I disagree with someone, I:',
    options: [
      { style: 'anchor', text: 'Avoid the conflict if I can' },
      { style: 'strategist', text: 'Lay out the facts calmly' },
      { style: 'driver', text: 'Say so directly' },
      { style: 'connector', text: 'Try to find common ground' },
    ],
  },
  {
    id: 6,
    prompt: "I'm most proud of being:",
    options: [
      { style: 'strategist', text: 'Accurate' },
      { style: 'anchor', text: 'Dependable' },
      { style: 'driver', text: 'Decisive' },
      { style: 'connector', text: 'Well-liked' },
    ],
  },
  {
    id: 7,
    prompt: 'My workspace tends to be:',
    options: [
      { style: 'connector', text: 'Full of personal touches' },
      { style: 'strategist', text: 'Organized and precise' },
      { style: 'anchor', text: 'Comfortable and familiar' },
      { style: 'driver', text: "Focused on what's urgent" },
    ],
  },
  {
    id: 8,
    prompt: 'When starting a new task, I:',
    options: [
      { style: 'strategist', text: 'Plan every step first' },
      { style: 'driver', text: 'Jump in right away' },
      { style: 'anchor', text: 'Ease into it at my own pace' },
      { style: 'connector', text: 'Talk it through with someone' },
    ],
  },
  {
    id: 9,
    prompt: "I'd rather be seen as:",
    options: [
      { style: 'connector', text: 'Charming' },
      { style: 'driver', text: 'Powerful' },
      { style: 'strategist', text: 'Correct' },
      { style: 'anchor', text: 'Loyal' },
    ],
  },
  {
    id: 10,
    prompt: 'Change at work makes me feel:',
    options: [
      { style: 'anchor', text: 'Uneasy at first' },
      { style: 'connector', text: "Curious what's next" },
      { style: 'driver', text: 'Excited by the challenge' },
      { style: 'strategist', text: 'Cautious until I understand why' },
    ],
  },
  {
    id: 11,
    prompt: 'My biggest frustration is:',
    options: [
      { style: 'strategist', text: 'Sloppy work' },
      { style: 'driver', text: 'Slow decisions' },
      { style: 'anchor', text: 'Constant conflict' },
      { style: 'connector', text: 'Being ignored' },
    ],
  },
  {
    id: 12,
    prompt: 'In conversation, I tend to:',
    options: [
      { style: 'anchor', text: 'Listen more than I talk' },
      { style: 'connector', text: 'Tell stories and joke around' },
      { style: 'strategist', text: 'Ask a lot of clarifying questions' },
      { style: 'driver', text: 'Get straight to the point' },
    ],
  },
  {
    id: 13,
    prompt: 'I make decisions based on:',
    options: [
      { style: 'driver', text: 'Gut instinct and speed' },
      { style: 'strategist', text: 'Data and evidence' },
      { style: 'connector', text: "How it feels, and who's affected" },
      { style: 'anchor', text: "What's worked before" },
    ],
  },
  {
    id: 14,
    prompt: 'A compliment I love hearing:',
    options: [
      { style: 'anchor', text: '"You\'re always there for me"' },
      { style: 'driver', text: '"You get results"' },
      { style: 'strategist', text: '"You really know your stuff"' },
      { style: 'connector', text: '"You\'re so much fun"' },
    ],
  },
  {
    id: 15,
    prompt: "When I'm stressed, I become:",
    options: [
      { style: 'strategist', text: 'Rigid and critical' },
      { style: 'connector', text: 'Scattered and talkative' },
      { style: 'driver', text: 'Impatient and blunt' },
      { style: 'anchor', text: 'Withdrawn and quiet' },
    ],
  },
  {
    id: 16,
    prompt: 'I prefer a boss who:',
    options: [
      { style: 'connector', text: 'Makes work feel exciting' },
      { style: 'anchor', text: 'Treats me like family' },
      { style: 'driver', text: 'Gets out of my way' },
      { style: 'strategist', text: 'Explains the reasoning' },
    ],
  },
  {
    id: 17,
    prompt: 'My ideal weekend involves:',
    options: [
      { style: 'strategist', text: 'Diving into a personal project' },
      { style: 'driver', text: 'Doing something competitive or active' },
      { style: 'anchor', text: 'Relaxing with close friends or family' },
      { style: 'connector', text: 'Being around lots of people' },
    ],
  },
  {
    id: 18,
    prompt: 'When given feedback, I want it:',
    options: [
      { style: 'anchor', text: 'Delivered gently and privately' },
      { style: 'strategist', text: 'Backed by specifics and examples' },
      { style: 'connector', text: 'Delivered warmly' },
      { style: 'driver', text: 'Short and direct' },
    ],
  },
  {
    id: 19,
    prompt: 'I measure success by:',
    options: [
      { style: 'driver', text: 'Results and rankings' },
      { style: 'anchor', text: 'Consistency and trust earned' },
      { style: 'connector', text: 'Recognition and relationships' },
      { style: 'strategist', text: 'Correctness and quality' },
    ],
  },
  {
    id: 20,
    prompt: 'People sometimes see me as:',
    options: [
      { style: 'connector', text: 'Too scattered' },
      { style: 'strategist', text: 'Too critical' },
      { style: 'anchor', text: 'Too passive' },
      { style: 'driver', text: 'Too blunt' },
    ],
  },
];

export interface ScoreResult {
  raw: Record<StyleKey, number>;
  percent: Record<StyleKey, number>;
  ranked: StyleKey[];
}

export function scoreAnswers(answers: Record<number, { most: StyleKey; least: StyleKey }>): ScoreResult {
  const raw: Record<StyleKey, number> = { driver: 0, connector: 0, anchor: 0, strategist: 0 };
  Object.values(answers).forEach(({ most, least }) => {
    raw[most] += 1;
    raw[least] -= 1;
  });
  const n = QUESTIONS.length;
  const shifted: Record<StyleKey, number> = {
    driver: raw.driver + n,
    connector: raw.connector + n,
    anchor: raw.anchor + n,
    strategist: raw.strategist + n,
  };
  const total = shifted.driver + shifted.connector + shifted.anchor + shifted.strategist;
  const percent: Record<StyleKey, number> = {
    driver: Math.round((shifted.driver / total) * 100),
    connector: Math.round((shifted.connector / total) * 100),
    anchor: Math.round((shifted.anchor / total) * 100),
    strategist: Math.round((shifted.strategist / total) * 100),
  };
  const ranked = [...STYLE_ORDER].sort((a, b) => raw[b] - raw[a]);
  return { raw, percent, ranked };
}

export function blendInsight(primary: StyleKey, secondary: StyleKey): string {
  const p = STYLES[primary];
  const s = STYLES[secondary];
  return `You lead as a ${p.label}, with a real secondary streak of ${s.blendTrait}. That combination means people mostly experience you as ${p.label.toLowerCase()}-first — but ${s.label.toLowerCase()} instincts kick in more than most ${p.label.toLowerCase()}s show.`;
}
