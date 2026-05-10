import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig
} from "remotion";
import type React from "react";
import type { VideoInput } from "../../shared/types";
import { formatDate, formatDollar } from "../../shared/format";
import "./video.css";

function sceneOpacity(frame: number, start: number, end: number): number {
  return interpolate(frame, [start - 10, start, end - 10, end], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
}

function currencyGrowthPath(frame: number, startFrame: number): string {
  const p = interpolate(frame, [startFrame, startFrame + 110], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  const points = [
    [60, 1500],
    [160, 1180],
    [260, 1300],
    [360, 760],
    [470, 980],
    [590, 560],
    [690, 820],
    [800, 360],
    [940, 220],
    [1040, 120]
  ];
  const shown = Math.max(2, Math.ceil(points.length * p));
  return points
    .slice(0, shown)
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`)
    .join(" ");
}

function SceneShell({
  opacity,
  children
}: {
  opacity: number;
  children: React.ReactNode;
}) {
  return (
    <AbsoluteFill style={{ opacity }}>
      {children}
    </AbsoluteFill>
  );
}

export function CouldaMadeFinanceVideo(input: VideoInput) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const startLabel = formatDate(input.year, input.month, input.day);
  const amount = formatDollar(input.amount);
  const value = formatDollar(input.value);
  const growth = input.value / input.amount;

  const pulse = spring({ frame, fps, config: { damping: 18, stiffness: 80 } });
  const resultScale = spring({
    frame: frame - 330,
    fps,
    config: { damping: 16, stiffness: 90 }
  });

  return (
    <AbsoluteFill className="video-frame">
      <div className="grid-bg" />
      <svg className="chart-line" viewBox="0 0 1080 1920">
        <path d={currencyGrowthPath(frame, 10)} />
      </svg>
      <div className="vignette" />

      <SceneShell opacity={sceneOpacity(frame, 0, 145)}>
        <div className="top-market">
          <div className="ticker">{input.ticker.toUpperCase()}</div>
          <div className="date">{startLabel} - TODAY</div>
        </div>
        <div
          className="hero-words"
          style={{
            transform: `scale(${0.96 + pulse * 0.04})`
          }}
        >
          <span>this</span>
          <span>is</span>
          <span>what</span>
          <span>would&apos;ve</span>
          <span>happened</span>
        </div>
      </SceneShell>

      <SceneShell opacity={sceneOpacity(frame, 135, 270)}>
        <div className="center-stack">
          <div className="eyebrow">if you put</div>
          <div className="big-money">{amount}</div>
          <div className="eyebrow">into</div>
          <div className="company">{input.company}</div>
          <div className="eyebrow">in {startLabel}</div>
        </div>
      </SceneShell>

      <SceneShell opacity={sceneOpacity(frame, 260, 360)}>
        <div className="center-stack pause">
          <div className="eyebrow">and just held it</div>
          <div className="pause-amount">{amount}</div>
        </div>
      </SceneShell>

      <SceneShell opacity={sceneOpacity(frame, 340, 500)}>
        <div className="center-stack">
          <div className="eyebrow">would be worth</div>
          <div
            className="result-money"
            style={{ transform: `scale(${0.85 + resultScale * 0.15})` }}
          >
            {value}
          </div>
          <div className="gain">about {growth.toFixed(1)}x your money</div>
          <div className="eyebrow">today</div>
        </div>
      </SceneShell>

      <SceneShell opacity={sceneOpacity(frame, 490, 610)}>
        <div className="center-stack perspective">
          <div className="perspective-line">same asset.</div>
          <div className="perspective-line accent">just time.</div>
        </div>
      </SceneShell>

      <SceneShell opacity={sceneOpacity(frame, 600, 660)}>
        <div className="center-stack cta">
          <div className="brand">couldamade.com</div>
          <div className="cta-text">run yours now</div>
        </div>
      </SceneShell>
    </AbsoluteFill>
  );
}
