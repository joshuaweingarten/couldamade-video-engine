import type { CreativeAngle, ScenarioInput, ScriptScene, VideoInput } from "./types";
import { formatDate, formatDollar } from "./format";

const SCENE_TIMING: Array<[number, number]> = [
  [0, 145],
  [135, 270],
  [260, 360],
  [340, 500],
  [490, 610],
  [600, 660]
];

const ANGLE_HOOKS: Record<CreativeAngle, string> = {
  regret: "This is what would've happened",
  receipt: "The receipt is painful",
  shock: "Nobody expects this number",
  lesson: "The boring move won",
  comeback: "Time did the heavy lifting"
};

export function buildVideoIdeas(scenario: ScenarioInput): VideoInput[] {
  return scenario.angles.map((angle) => buildVideoInput(scenario, angle));
}

export function buildVideoInput(scenario: ScenarioInput, angle: CreativeAngle): VideoInput {
  const startLabel = formatDate(scenario.year, scenario.month, scenario.day);
  const amount = formatDollar(scenario.amount);
  const value = formatDollar(scenario.value);
  const multiple = scenario.value / scenario.amount;
  const hook = ANGLE_HOOKS[angle];
  const scenes = buildScenes({ scenario, angle, hook, amount, value, multiple, startLabel });
  const voiceover = scenes.map((scene) => scene.text).join(" ");

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
    accentColor: "#28f296",
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
  multiple,
  startLabel
}: {
  scenario: ScenarioInput;
  angle: CreativeAngle;
  hook: string;
  amount: string;
  value: string;
  multiple: number;
  startLabel: string;
}): ScriptScene[] {
  const company = scenario.company;
  const linesByAngle: Record<CreativeAngle, string[]> = {
    regret: [
      `${hook} if you bought ${company} instead.`,
      `Back in ${startLabel}, ${amount} was enough to start.`,
      `Then you just held it.`,
      `Today, that same position would be around ${value}.`,
      `That is about ${multiple.toFixed(1)} times your money.`,
      "Run yours now at couldamade.com."
    ],
    receipt: [
      `${hook}: ${company}, ${startLabel}.`,
      `${amount} in. No trading. No timing.`,
      "Just one decision and patience.",
      `The ending number is roughly ${value}.`,
      `That is a ${multiple.toFixed(1)}x receipt.`,
      "Check another one at couldamade.com."
    ],
    shock: [
      `${hook} for ${company}.`,
      `If ${amount} went in during ${startLabel},`,
      "and you did absolutely nothing,",
      `it would be worth about ${value} today.`,
      `${multiple.toFixed(1)}x is why timing matters.`,
      "Run your what-if at couldamade.com."
    ],
    lesson: [
      `${hook} with ${company}.`,
      `${amount} invested in ${startLabel}.`,
      "No perfect exit. No daily panic.",
      `Just holding turns it into about ${value}.`,
      `The lesson is the ${multiple.toFixed(1)}x gap.`,
      "Try your own at couldamade.com."
    ],
    comeback: [
      `${hook} for ${company}.`,
      `${amount} back in ${startLabel}.`,
      "The chart was never a straight line.",
      `But the current value is about ${value}.`,
      `That is roughly ${multiple.toFixed(1)} times back.`,
      "Make your own at couldamade.com."
    ]
  };

  return linesByAngle[angle].map((text, index) => ({
    text,
    startFrame: SCENE_TIMING[index][0],
    endFrame: SCENE_TIMING[index][1],
    emphasis: index === 3 ? value : undefined
  }));
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
