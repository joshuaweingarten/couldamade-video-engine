import type { CreativeAngle, QualityPreset, ScenarioInput, ScriptScene, VideoInput, VisualStyle } from "./types";
import { formatDate, formatDollar, formatMultiple } from "./format";
import { getBrandColor, getBrandLogoUrl } from "./brandIconDatabase";

const TOTAL_FRAMES = 660;
const NARRATION_FRAMES = 560;

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

export function buildVideoIdeas(scenario: ScenarioInput): VideoInput[] {
  return [buildProVideoInput(scenario), ...scenario.angles.map((angle) => buildVideoInput(scenario, angle))];
}

export function buildProVideoInput(scenario: ScenarioInput): VideoInput {
  const company = shortCompanyName(scenario.company);
  const amount = formatDollar(scenario.amount);
  const value = formatDollar(scenario.value);
  const multiple = scenario.value / scenario.amount;
  const multipleLabel = formatMultiple(multiple);
  const resultColor = multiple >= 1 ? GAIN_COLOR : LOSS_COLOR;
  const hook = `${amount} in ${company} did something stupid.`;
  const scenes = buildProScenes({ scenario, company, amount, value, multipleLabel });
  const voiceover = scenes.map((scene) => scene.text).join("\n\n");

  return {
    template: "couldamade-pro",
    ticker: scenario.ticker,
    company: scenario.company,
    assetType: scenario.assetType,
    amount: scenario.amount,
    value: scenario.value,
    year: scenario.year,
    month: scenario.month,
    day: scenario.day,
    platform: scenario.platform,
    angle: "shock",
    hook,
    voiceover,
    caption: `${amount} in ${company} (${scenario.ticker.toUpperCase()}) in ${scenario.year} would be about ${value} today. That is ${multipleLabel} your money. See what you could have made at couldamade.com. For education only.`,
    accentColor: resultColor,
    brandColor: getBrandColor(scenario.ticker) ?? resultColor,
    logoUrl: scenario.logoUrl?.trim() || getBrandLogoUrl(scenario.ticker),
    visualStyle: "terminal",
    qualityPreset: "punchy",
    disclaimer: "Not financial advice. For education only.",
    scenes
  };
}

export function buildVideoInput(scenario: ScenarioInput, angle: CreativeAngle): VideoInput {
  const startLabel = formatDate(scenario.year, scenario.month, scenario.day);
  const amount = formatDollar(scenario.amount);
  const value = formatDollar(scenario.value);
  const multiple = scenario.value / scenario.amount;
  const multipleLabel = formatMultiple(multiple);
  const hook = buildOpeningHook(scenario.company, amount, scenario.year);
  const scenes = buildScenes({ scenario, angle, amount, value, multipleLabel, startLabel });
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
    brandColor: getBrandColor(scenario.ticker) ?? resultColor,
    logoUrl: scenario.logoUrl?.trim() || getBrandLogoUrl(scenario.ticker),
    visualStyle,
    qualityPreset: PRESET_BY_ANGLE[angle],
    disclaimer: "Not financial advice. For education only.",
    scenes
  };
}

function buildScenes({
  scenario,
  angle,
  amount,
  value,
  multipleLabel,
  startLabel
}: {
  scenario: ScenarioInput;
  angle: CreativeAngle;
  amount: string;
  value: string;
  multipleLabel: string;
  startLabel: string;
}): ScriptScene[] {
  const company = scenario.company;
  const openingHook = buildOpeningHook(company, amount, scenario.year);
  const linesByAngle: Record<CreativeAngle, string[]> = {
    regret: [
      openingHook,
      "No perfect timing. No extra deposits.",
      `today it would be about ${value}.`,
      `That is roughly ${multipleLabel} the original amount.`,
      "See what you could have made at couldamade.com."
    ],
    receipt: [
      openingHook,
      `The buy date was ${startLabel}.`,
      "Then the only move was staying invested.",
      `Just years of staying invested gets to about ${value}.`,
      `That is roughly ${multipleLabel} your original money.`,
      "Check another one at couldamade.com."
    ],
    shock: [
      openingHook,
      "The final number is the part that feels fake.",
      `That one saved amount could be about ${value} now.`,
      "Not because you traded it.",
      "Because staying invested did the work.",
      "Run your what-if at couldamade.com."
    ],
    lesson: [
      openingHook,
      "The lesson is painfully simple.",
      "Saving early gave the money room to work.",
      `The number now is about ${value}.`,
      `That is around ${multipleLabel} over the years.`,
      "Try your own at couldamade.com."
    ],
    comeback: [
      openingHook,
      `${company} did not move in a straight line.`,
      "There were drops, noise, and boring stretches.",
      `But staying invested gets you near ${value}.`,
      `That is about ${multipleLabel} from patience.`,
      "Make your own at couldamade.com."
    ]
  };

  return buildAdaptiveScenes(linesByAngle[angle]).map((scene, index) => ({
    ...scene,
    emphasis: scene.text.includes(value) ? value : scene.text.includes(multipleLabel) ? multipleLabel : undefined
  }));
}

function buildProScenes({
  scenario,
  company,
  amount,
  value,
  multipleLabel
}: {
  scenario: ScenarioInput;
  company: string;
  amount: string;
  value: string;
  multipleLabel: string;
}): ScriptScene[] {
  const lines = [
    `${amount} in ${company} did something stupid.`,
    `If you had invested it in ${company} in ${scenario.year},`,
    "No trading. No perfect timing. Just holding.",
    `It would be about ${value} today.`,
    `That is ${multipleLabel} your money from one boring decision.`,
    "See what you could have made at couldamade.com."
  ];
  const windows: Array<[number, number]> = [
    [0, 82],
    [74, 174],
    [166, 318],
    [306, 444],
    [432, 590],
    [580, TOTAL_FRAMES]
  ];

  return lines.map((text, index) => ({
    text,
    startFrame: windows[index][0],
    endFrame: windows[index][1],
    emphasis: text.includes(value) ? value : text.includes(multipleLabel) ? multipleLabel : text.includes(amount) ? amount : undefined
  }));
}

function shortCompanyName(company: string): string {
  return company
    .replace(/\b(incorporated|inc\.?|corporation|corp\.?|company|co\.?|group|holdings?)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim() || company;
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

function buildOpeningHook(company: string, amount: string, year: number): string {
  return `If you had invested ${amount} in ${company} in ${year}, this is what would have happened.`;
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

  return `${prefixByAngle[angle]} ${amount} in ${company} (${ticker.toUpperCase()}) would be about ${value} now, around ${formatMultiple(multiple)}. For education only.`;
}
