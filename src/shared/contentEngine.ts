import type { CreativeAngle, QualityPreset, ScenarioInput, ScriptScene, VideoInput, VisualStyle } from "./types";
import { formatDate, formatDollar } from "./format";

const TOTAL_FRAMES = 660;

const ANGLE_HOOKS: Record<CreativeAngle, string> = {
  regret: "You missed this",
  receipt: "The receipt is painful",
  shock: "$1K became how much?",
  lesson: "The boring move won",
  comeback: "Time did the heavy lifting"
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

const ACCENT_BY_STYLE: Record<VisualStyle, string> = {
  terminal: "#28f296",
  receipt: "#f2d766",
  regret: "#ff4d5d",
  clean: "#2f6df6",
  newsroom: "#20c4ff"
};

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
  const voiceover = scenes.map((scene) => scene.text).join(" ");
  const visualStyle = STYLE_BY_ANGLE[angle];

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
    accentColor: ACCENT_BY_STYLE[visualStyle],
    brandColor: KNOWN_BRAND_COLORS[scenario.ticker.toUpperCase()] ?? ACCENT_BY_STYLE[visualStyle],
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
      `${hook}: ${company} would have changed the math.`,
      `Back in ${startLabel}, ${amount} was enough to start.`,
      `Then you just held it.`,
      `Today, that same position would be around ${value}.`,
      `That is about ${spokenMultiple} times your money.`,
      "Run yours now at couldamade.com."
    ],
    receipt: [
      `${hook}: ${company}, ${startLabel}.`,
      `${amount} in. No trading. No timing.`,
      "Just one decision and patience.",
      `The ending number is roughly ${value}.`,
      `That is a ${spokenMultiple}x receipt.`,
      "Check another one at couldamade.com."
    ],
    shock: [
      `${hook} ${company}.`,
      `If ${amount} went in during ${startLabel},`,
      "and you did absolutely nothing,",
      `it would be worth about ${value} today.`,
      `${spokenMultiple}x is why timing matters.`,
      "Run your what-if at couldamade.com."
    ],
    lesson: [
      `${hook} with ${company}.`,
      `${amount} invested in ${startLabel}.`,
      "No perfect exit. No daily panic.",
      `Just holding turns it into about ${value}.`,
      `The lesson is the ${spokenMultiple}x gap.`,
      "Try your own at couldamade.com."
    ],
    comeback: [
      `${hook} for ${company}.`,
      `${amount} back in ${startLabel}.`,
      "The chart was never a straight line.",
      `But the current value is about ${value}.`,
      `That is roughly ${spokenMultiple} times back.`,
      "Make your own at couldamade.com."
    ]
  };

  return buildAdaptiveScenes(linesByAngle[angle]).map((scene, index) => ({
    ...scene,
    emphasis: index === 3 ? value : undefined
  }));
}

function buildAdaptiveScenes(lines: string[]): ScriptScene[] {
  const minFrames = [112, 106, 88, 126, 92, 72];
  const weights = lines.map((line, index) => Math.max(minFrames[index], 54 + line.length * 1.6));
  const totalWeight = weights.reduce((sum, value) => sum + value, 0);
  const durations = weights.map((weight, index) => {
    const frameCount = Math.round((weight / totalWeight) * TOTAL_FRAMES);
    return Math.max(minFrames[index], frameCount);
  });
  while (durations.reduce((sum, value) => sum + value, 0) > TOTAL_FRAMES) {
    const index = durations
      .map((duration, durationIndex) => ({ duration, durationIndex, room: duration - minFrames[durationIndex] }))
      .sort((a, b) => b.room - a.room)[0]?.durationIndex;
    if (index === undefined || durations[index] <= minFrames[index]) break;
    durations[index] -= 1;
  }

  let cursor = 0;
  return lines.map((text, index) => {
    const startFrame = Math.max(0, cursor - (index === 0 ? 0 : 10));
    cursor += durations[index];
    const endFrame = index === lines.length - 1 ? TOTAL_FRAMES : cursor;
    return {
      text,
      startFrame,
      endFrame
    };
  });
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
    regret: "The missed-opportunity math hurts.",
    receipt: "Here is the receipt.",
    shock: "This number surprised me.",
    lesson: "The boring move won.",
    comeback: "The line was messy, but time mattered."
  };

  return `${prefixByAngle[angle]} ${amount} in ${company} (${ticker.toUpperCase()}) would be about ${value} now, around ${multiple.toFixed(1)}x. Not financial advice.`;
}

function formatSpokenMultiple(multiple: number): string {
  return Math.max(1, Math.round(multiple)).toLocaleString("en-US");
}
