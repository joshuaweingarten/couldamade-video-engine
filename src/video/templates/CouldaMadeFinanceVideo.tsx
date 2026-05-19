import {
  AbsoluteFill,
  Audio,
  Easing,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig
} from "remotion";
import type React from "react";
import type { VideoInput } from "../../shared/types";
import { formatDate, formatDollar } from "../../shared/format";
import "./video.css";

function sceneOpacity(frame: number, start: number, end: number): number {
  return interpolate(frame, [start - 8, start, end - 8, end], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
}

function sceneProgress(frame: number, start: number, end: number): number {
  return interpolate(frame, [start, end], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic)
  });
}

function countUpValue(frame: number, startFrame: number, endFrame: number, amount: number): number {
  const p = interpolate(frame, [startFrame, endFrame], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic)
  });
  return amount * p;
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

function splitCaption(text: string): { before: string; emphasis: string; after: string } {
  const words = text.split(" ");
  if (words.length < 4) {
    return { before: "", emphasis: text, after: "" };
  }
  const emphasisIndex = Math.min(words.length - 1, Math.max(1, Math.floor(words.length * 0.62)));
  return {
    before: words.slice(0, emphasisIndex).join(" "),
    emphasis: words[emphasisIndex],
    after: words.slice(emphasisIndex + 1).join(" ")
  };
}

function SceneShell({
  opacity,
  progress,
  className,
  children
}: {
  opacity: number;
  progress: number;
  className?: string;
  children: React.ReactNode;
}) {
  const y = interpolate(progress, [0, 1], [28, -18]);
  const scale = interpolate(progress, [0, 1], [0.985, 1.025]);
  return (
    <AbsoluteFill className={className} style={{ opacity, transform: `translateY(${y}px) scale(${scale})` }}>
      {children}
    </AbsoluteFill>
  );
}

function MarketTape({ ticker, company, value }: { ticker: string; company: string; value: string }) {
  const frame = useCurrentFrame();
  const rows = [0, 1, 2];
  return (
    <div className="market-tape">
      {rows.map((row) => (
        <div
          key={row}
          className="tape-row"
          style={{ transform: `translateX(${(row % 2 === 0 ? -1 : 1) * ((frame * (1.6 + row * 0.4)) % 520)}px)` }}
        >
          {Array.from({ length: 8 }).map((_, index) => (
            <span key={index}>
              {ticker.toUpperCase()} {company} {value} +{(12 + row * 7 + index * 3).toFixed(1)}%
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

function FloatingNumbers({ amount, value }: { amount: string; value: string }) {
  const frame = useCurrentFrame();
  const items = [amount, "+18%", value, "HOLD", "+42%", "TIME", "+7.8x", "TODAY"];
  return (
    <div className="floating-numbers">
      {items.map((item, index) => {
        const seed = random(`float-${index}`);
        const x = 70 + seed * 820;
        const drift = Math.sin((frame + index * 23) / 28) * 26;
        const y = 220 + index * 170 + Math.cos((frame + index * 31) / 34) * 36;
        return (
          <span
            key={item + index}
            style={{
              left: x + drift,
              top: y % 1660,
              opacity: 0.14 + seed * 0.16,
              transform: `rotate(${Math.sin((frame + index) / 40) * 6}deg)`
            }}
          >
            {item}
          </span>
        );
      })}
    </div>
  );
}

function SpokenCaption({ text, opacity }: { text: string; opacity: number }) {
  const parts = splitCaption(text);
  return (
    <div className="spoken-caption" style={{ opacity }}>
      {parts.before && <span>{parts.before} </span>}
      <strong>{parts.emphasis}</strong>
      {parts.after && <span> {parts.after}</span>}
    </div>
  );
}

export function CouldaMadeFinanceVideo(input: VideoInput) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const startLabel = formatDate(input.year, input.month, input.day);
  const amount = formatDollar(input.amount);
  const value = formatDollar(input.value);
  const growth = input.value / input.amount;
  const activeScene = input.scenes?.find((scene) => frame >= scene.startFrame && frame <= scene.endFrame);
  const captionOpacity = activeScene ? sceneOpacity(frame, activeScene.startFrame, activeScene.endFrame) : 0;
  const countedValue = formatDollar(countUpValue(frame, 350, 445, input.value));
  const cameraX = Math.sin(frame / 58) * 18;
  const cameraY = Math.cos(frame / 72) * 24;
  const cameraScale = 1.03 + Math.sin(frame / 115) * 0.018;

  const pulse = spring({ frame, fps, config: { damping: 18, stiffness: 80 } });
  const resultScale = spring({
    frame: frame - 330,
    fps,
    config: { damping: 16, stiffness: 90 }
  });

  return (
    <AbsoluteFill className="video-frame" style={{ "--accent": input.accentColor } as React.CSSProperties}>
      {input.voiceoverAudioUrl && <Audio src={input.voiceoverAudioUrl} />}
      <AbsoluteFill
        className="motion-world"
        style={{ transform: `translate(${cameraX}px, ${cameraY}px) scale(${cameraScale})` }}
      >
        <div className="grid-bg" />
        <MarketTape ticker={input.ticker} company={input.company} value={value} />
        <FloatingNumbers amount={amount} value={value} />
        <svg className="chart-line" viewBox="0 0 1080 1920">
          <path d={currencyGrowthPath(frame, 10)} />
        </svg>
        <div className="price-wash" />
      </AbsoluteFill>
      <div className="vignette" />
      <div className="scanline" />

      <SceneShell opacity={sceneOpacity(frame, 0, 145)} progress={sceneProgress(frame, 0, 145)} className="scene-intro">
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
          <span>{input.hook}</span>
        </div>
        <div className="side-card">
          <span>what-if check</span>
          <strong>{growth.toFixed(1)}x</strong>
        </div>
      </SceneShell>

      <SceneShell opacity={sceneOpacity(frame, 135, 270)} progress={sceneProgress(frame, 135, 270)} className="scene-buy">
        <div className="center-stack">
          <div className="eyebrow">if you put</div>
          <div className="big-money">{amount}</div>
          <div className="company-lockup">
            <div className="eyebrow">into</div>
            <div className="company">{input.company}</div>
            <div className="eyebrow">in {startLabel}</div>
          </div>
        </div>
        <div className="receipt-panel">
          <div><span>asset</span><strong>{input.ticker.toUpperCase()}</strong></div>
          <div><span>entry</span><strong>{startLabel}</strong></div>
          <div><span>stake</span><strong>{amount}</strong></div>
        </div>
      </SceneShell>

      <SceneShell opacity={sceneOpacity(frame, 260, 360)} progress={sceneProgress(frame, 260, 360)} className="scene-hold">
        <div className="center-stack pause">
          <div className="eyebrow">and just held it</div>
          <div className="pause-amount">{amount}</div>
        </div>
        <div className="hold-timeline">
          {["buy", "wait", "ignore noise", "today"].map((label, index) => (
            <div key={label} className={frame > 270 + index * 18 ? "active" : ""}>
              <i />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </SceneShell>

      <SceneShell opacity={sceneOpacity(frame, 340, 500)} progress={sceneProgress(frame, 340, 500)} className="scene-result">
        <div className="center-stack">
          <div className="eyebrow">would be worth</div>
          <div
            className="result-money"
            style={{ transform: `scale(${0.85 + resultScale * 0.15})` }}
          >
            {frame < 445 ? countedValue : value}
          </div>
          <div className="gain-pill">about {growth.toFixed(1)}x your money</div>
          <div className="eyebrow">today</div>
        </div>
        <div className="burst-ring" />
      </SceneShell>

      <SceneShell opacity={sceneOpacity(frame, 490, 610)} progress={sceneProgress(frame, 490, 610)} className="scene-lesson">
        <div className="center-stack perspective">
          <div className="perspective-line">same asset.</div>
          <div className="perspective-line accent">just time.</div>
        </div>
        <div className="split-comparison">
          <div><span>trading</span><strong>noise</strong></div>
          <div><span>holding</span><strong>{growth.toFixed(1)}x</strong></div>
        </div>
      </SceneShell>

      <SceneShell opacity={sceneOpacity(frame, 600, 660)} progress={sceneProgress(frame, 600, 660)} className="scene-cta">
        <div className="center-stack cta">
          <div className="brand">couldamade.com</div>
          <div className="cta-text">run yours now</div>
        </div>
      </SceneShell>

      {activeScene && (
        <SpokenCaption text={activeScene.text} opacity={captionOpacity} />
      )}
      <div className="disclaimer">{input.disclaimer}</div>
    </AbsoluteFill>
  );
}
