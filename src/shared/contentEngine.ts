import type { CreativeAngle, QualityPreset, ScenarioInput, ScriptScene, VideoInput, VisualStyle } from "./types";
import { formatDate, formatDollar } from "./format";

const TOTAL_FRAMES = 660;
const NARRATION_FRAMES = 560;

const ANGLE_HOOKS: Record<CreativeAngle, string> = {
  regret: "You coulda made this",
  receipt: "The math is brutal",
  shock: "$1K quietly became this",
  lesson: "Saving did the work",
  comeback: "The chart was messy"
};

const STYLE_BY_ANGLE: Record<CreativeAngle, VisualStyle> = {
  regret: "regret",
  receipt: "receipt",
  shock: "terminal",
  lesson: "clean",
  comeback: "newsroom"
};

const PRESET_BY_ANGLE: Record<CreativeAngle, QualityPreset> = {
  regret: "dramatic-regret",
  receipt: "clean-finance",
  shock: "punchy",
  lesson: "clean-finance",
  comeback: "punchy"
};

const GAIN_COLOR = "#28f296";
const LOSS_COLOR = "#ff4d5d";

const KNOWN_BRAND_COLORS: Record<string, string> = {
  AAPL: "#a8b0b8",
  AMZN: "#ff9900",
  BTC: "#f7931a",
  GOOGL: "#4285f4",
  META: "#0866ff",
  MSFT: "#7fba00",
  NVDA: "#76b900",
  TSLA: "#e82127"
};

const KNOWN_LOGO_DOMAINS: Record<string, string> = {
  AAPL: "apple.com",
  AMZN: "amazon.com",
  GOOGL: "google.com",
  META: "meta.com",
  MSFT: "microsoft.com",
  NVDA: "nvidia.com",
  TSLA: "tesla.com"
};

export function buildVideoIdeas(scenario: ScenarioInput): VideoInput[] {
  return scenario.angles.map((angle) => buildVideoInput(scenario, angle));
}

export function buildVideoInput(scenario: ScenarioInput, angle: CreativeAngle): VideoInput {
  const startLabel = formatDate(scenario.year, scenario.month, scenario.day);
  const amount = formatDollar(scenario.amount);
  const value = formatDollar(scenario.value);
  const multiple = scenario.value / scenario.amount;
  const spokenMultiple = formatSpokenMultiple(multiple);
  const hook = ANGLE_HOOKS[angle];
  const scenes = buildScenes({ scenario, angle, hook, amount, value, spokenMultiple, startLabel });
  const voiceover = scenes.map((scene) => scene.text).join("\n\n");
  const visualStyle = STYLE_BY_ANGLE[angle];
  const resultColor = multiple >= 1 ? GAIN_COLOR : LOSS_COLOR;

  return {
    template: "couldamade-finance",
    ticker: scenario.ticker,
    company: scenario.company,
    assetType: scenario.assetType,
    amount: scenario.amount,
    value: scenario.value,
    year: scenario.year,
    month: scenario.month,
    day: scenario.day,
    platform: scenario.platform,
    angle,
    hook,
    voiceover,
    caption: buildCaption(scenario.company, scenario.ticker, amount, value, multiple, angle),
    accentColor: resultColor,
    brandColor: KNOWN_BRAND_COLORS[scenario.ticker.toUpperCase()] ?? resultColor,
    logoUrl: scenario.logoUrl?.trim() || getKnownLogoUrl(scenario.ticker),
    visualStyle,
    qualityPreset: PRESET_BY_ANGLE[angle],
    disclaimer: "Not financial advice. For education only.",
    scenes
  };
}

function buildScenes({
  scenario,
  angle,
  hook,
  amount,
  value,
  spokenMultiple,
  startLabel
}: {
  scenario: ScenarioInput;
  angle: CreativeAngle;
  hook: string;
  amount: string;
  value: string;
  spokenMultiple: string;
  startLabel: string;
}): ScriptScene[] {
  const company = scenario.company;
  const linesByAngle: Record<CreativeAngle, string[]> = {
    regret: [
      `Here is the CouldaMade check for ${company}.`,
      `If ${amount} went in on ${startLabel},`,
      "and you simply left it alone,",
      `today it would be about ${value}.`,
      `That is roughly ${spokenMultiple} times the original amount.`,
      "Run yours now at couldamade.com."
    ],
    receipt: [
      `Here is the receipt for ${company}.`,
      `${amount} saved into it on ${startLabel}.`,
      "No extra moves. No prediction.",
      `Just years of staying invested gets to about ${value}.`,
      `That is roughly ${spokenMultiple}x your original money.`,
      "Check another one at couldamade.com."
    ],
    shock: [
      `${company} is a wild what-if.`,
      `${amount} saved back on ${startLabel}`,
      `could be worth about ${value} now.`,
      "Not because you traded it.",
      "Because staying invested did the work.",
      "Run your what-if at couldamade.com."
    ],
    lesson: [
      `This is the quiet lesson from ${company}.`,
      `${amount} saved on ${startLabel}.`,
      "The hard part was leaving it alone.",
      `The number now is about ${value}.`,
      `That is around ${spokenMultiple}x over the years.`,
      "Try your own at couldamade.com."
    ],
    comeback: [
      `${company} did not move in a straight line.`,
      `${amount} saved on ${startLabel}.`,
      "There were drops, noise, and boring stretches.",
      `But staying invested gets you near ${value}.`,
      `That is about ${spokenMultiple}x from patience.`,
      "Make your own at couldamade.com."
    ]
  };

  return buildAdaptiveScenes(linesByAngle[angle]).map((scene, index) => ({
    ...scene,
    emphasis: index === 3 ? value : undefined
  }));
}

function buildAdaptiveScenes(lines: string[]): ScriptScene[] {
  const minFrames = [70, 66, 58, 76, 66, 52];
  const durations = lines.map((line, index) => Math.max(minFrames[index], estimateSpokenFrames(line, index)));
  const totalDuration = durations.reduce((sum, value) => sum + value, 0);
  if (totalDuration > NARRATION_FRAMES) {
    const scale = NARRATION_FRAMES / totalDuration;
    durations.forEach((duration, index) => {
      durations[index] = Math.max(minFrames[index], Math.round(duration * scale));
    });
  }

  let cursor = 0;
  return lines.map((text, index) => {
    const startFrame = Math.max(0, cursor - (index === 0 ? 0 : 4));
    cursor += durations[index];
    const endFrame = index === lines.length - 1 ? TOTAL_FRAMES : cursor;
    return {
      text,
      startFrame,
      endFrame
    };
  });
}

function estimateSpokenFrames(line: string, index: number): number {
  const words = line.trim().split(/\s+/).filter(Boolean).length;
  const punctuationPause = /[.!?]$/.test(line.trim()) ? 14 : 8;
  const openingHold = index === 0 ? 10 : 0;
  return Math.round(words * 11.5 + punctuationPause + openingHold);
}

function buildCaption(
  company: string,
  ticker: string,
  amount: string,
  value: string,
  multiple: number,
  angle: CreativeAngle
): string {
  const prefixByAngle: Record<CreativeAngle, string> = {
    regret: "A simple what-if can look unreal in hindsight.",
    receipt: "The receipt on one saved amount.",
    shock: "A long-term what-if with a wild ending.",
    lesson: "The quiet part is staying invested.",
    comeback: "Messy chart, simple habit."
  };

  return `${prefixByAngle[angle]} ${amount} in ${company} (${ticker.toUpperCase()}) would be about ${value} now, around ${multiple.toFixed(1)}x. For education only.`;
}

function formatSpokenMultiple(multiple: number): string {
  return Math.max(1, Math.round(multiple)).toLocaleString("en-US");
}

function getKnownLogoUrl(ticker: string): string | undefined {
  const domain = KNOWN_LOGO_DOMAINS[ticker.toUpperCase()];
  return domain ? `https://logo.clearbit.com/${domain}` : undefined;
}
