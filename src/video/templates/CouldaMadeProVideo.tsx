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
import { useState } from "react";
import type React from "react";
import type { VideoInput } from "../../shared/types";
import { formatDate, formatDollar, formatMultiple } from "../../shared/format";
import { getBrandColor, getBrandIcon, getBrandLogoUrl } from "../../shared/brandIconDatabase";
import "./pro.css";

const DEFAULT_SCENE_WINDOWS: Array<[number, number]> = [
  [0, 54],
  [48, 126],
  [120, 245],
  [236, 395],
  [386, 555],
  [546, 660]
];

function sceneOpacity(frame: number, start: number, end: number): number {
  return interpolate(frame, [start - 6, start, end - 10, end], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
}

function sceneProgress(frame: number, start: number, end: number): number {
  return interpolate(frame, [start, end], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic)
  });
}

function getScene(input: VideoInput, index: number, text: string) {
  const fallback = DEFAULT_SCENE_WINDOWS[index] ?? [0, 660];
  return input.scenes?.[index] ?? { text, startFrame: fallback[0], endFrame: fallback[1] };
}

function getBrandInitials(company: string, ticker: string): string {
  const words = company.replace(/[^a-zA-Z0-9 ]/g, "").split(" ").filter(Boolean);
  if (words.length >= 2) return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  return ticker.slice(0, 2).toUpperCase();
}

function shortCompanyName(company: string): string {
  return company
    .replace(/\b(incorporated|inc\.?|corporation|corp\.?|company|co\.?|group|holdings?)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim() || company;
}

function getCompanyFontSize(company: string): number {
  const words = company.split(/\s+/).filter(Boolean);
  const longestWord = Math.max(...words.map((word) => word.length), 1);
  const byWord = Math.floor(910 / (longestWord * 0.58));
  const byLength = Math.floor(120 - Math.max(0, company.length - 18) * 1.35);
  return Math.max(56, Math.min(120, byWord, byLength));
}

function ProWords({ text }: { text: string }) {
  return (
    <>
      {text.split(/\s+/).filter(Boolean).map((word, index) => (
        <span className="pro-word" key={`${word}-${index}`}>
          {word}
        </span>
      ))}
    </>
  );
}

function BrandIconSvg({ ticker }: { ticker: string }) {
  const icon = getBrandIcon(ticker);
  if (!icon) return null;
  return (
    <svg
      className="pro-brand-icon-svg"
      viewBox={icon.viewBox}
      role="img"
      aria-label={icon.title}
      style={{ display: "block", width: "100%", height: "100%", fill: `#${icon.hex ?? "111111"}` }}
      dangerouslySetInnerHTML={{ __html: icon.body }}
    />
  );
}

function LogoImage({ logoUrl, initials }: { logoUrl?: string; initials: string }) {
  const [failed, setFailed] = useState(false);
  if (logoUrl && !failed) {
    return <img src={logoUrl} onError={() => setFailed(true)} />;
  }
  return <span>{initials}</span>;
}

function BrandBadge({ logoUrl, initials, ticker }: { logoUrl?: string; initials: string; ticker: string }) {
  const hasLocalIcon = Boolean(getBrandIcon(ticker));
  return (
    <div className={`pro-brand-badge ${hasLocalIcon || logoUrl ? "has-logo" : ""}`}>
      {hasLocalIcon ? <BrandIconSvg ticker={ticker} /> : <LogoImage logoUrl={logoUrl} initials={initials} />}
    </div>
  );
}

function MoneyRain({ amount, value, multiple }: { amount: string; value: string; multiple: string }) {
  const frame = useCurrentFrame();
  const items = [amount, value, multiple, "HOLD", "TODAY", amount, value, multiple, "NO TRADING", "ONE DECISION"];
  return (
    <div className="pro-money-rain">
      {items.map((item, index) => {
        const seed = random(`pro-rain-${index}`);
        const y = (frame * (1.4 + seed * 1.6) + index * 195) % 2050;
        const x = 42 + seed * 960;
        return (
          <span
            key={`${item}-${index}`}
            style={{
              left: x,
              top: y - 110,
              opacity: 0.08 + seed * 0.13,
              transform: `rotate(${Math.sin((frame + index * 19) / 26) * 7}deg)`
            }}
          >
            {item}
          </span>
        );
      })}
    </div>
  );
}

function ChartRibbon({ isGain }: { isGain: boolean }) {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [45, 390], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const gainPath = "M -30 1520 L 130 1370 L 250 1430 L 385 1040 L 520 1160 L 670 780 L 800 925 L 940 420 L 1140 230";
  const lossPath = "M -30 330 L 120 460 L 265 405 L 400 760 L 540 690 L 675 1060 L 820 960 L 955 1435 L 1140 1605";
  return (
    <svg className="pro-chart" viewBox="0 0 1080 1920">
      <path
        d={isGain ? gainPath : lossPath}
        pathLength={1}
        style={{
          strokeDasharray: 1,
          strokeDashoffset: 1 - p
        }}
      />
    </svg>
  );
}

function SceneLayer({
  scene,
  className,
  children
}: {
  scene: { startFrame: number; endFrame: number };
  className: string;
  children: React.ReactNode;
}) {
  const frame = useCurrentFrame();
  const progress = sceneProgress(frame, scene.startFrame, scene.endFrame);
  const opacity = sceneOpacity(frame, scene.startFrame, scene.endFrame);
  const y = interpolate(progress, [0, 1], [42, -22]);
  const scale = interpolate(progress, [0, 1], [0.97, 1.035]);
  return (
    <AbsoluteFill className={className} style={{ opacity, transform: `translateY(${y}px) scale(${scale})` }}>
      {children}
    </AbsoluteFill>
  );
}

function WordCaption({ text, opacity }: { text: string; opacity: number }) {
  return (
    <div className="pro-caption" style={{ opacity }}>
      <ProWords text={text} />
    </div>
  );
}

export function CouldaMadeProVideo(input: VideoInput) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const amount = formatDollar(input.amount);
  const value = formatDollar(input.value);
  const growth = input.value / input.amount;
  const multipleLabel = formatMultiple(growth);
  const isGain = growth >= 1;
  const resultColor = isGain ? "#28f296" : "#ff4d5d";
  const resultSoftColor = isGain ? "#0b5f45" : "#661a24";
  const brandColor = getBrandColor(input.ticker) ?? input.brandColor ?? resultColor;
  const company = shortCompanyName(input.company);
  const startLabel = formatDate(input.year, input.month, input.day);
  const brandInitials = getBrandInitials(input.company, input.ticker);
  const logoUrl = input.logoUrl?.trim() || getBrandLogoUrl(input.ticker);
  const fallbackLines = [
    `${amount} in ${company} did something stupid.`,
    `If you had invested it in ${company} in ${input.year},`,
    "No trading. No perfect timing. Just holding.",
    `It would be about ${value} today.`,
    `That is ${multipleLabel} your money from one boring decision.`,
    "Run yours now at couldamade.com."
  ];
  const scenes = fallbackLines.map((line, index) => getScene(input, index, line));
  const activeScene = scenes.find((scene) => frame >= scene.startFrame && frame <= scene.endFrame);
  const captionOpacity = activeScene ? sceneOpacity(frame, activeScene.startFrame, activeScene.endFrame) : 0;
  const cameraShake = frame < 60 ? Math.sin(frame * 1.7) * 6 : Math.sin(frame / 42) * 3;
  const revealSpring = spring({ frame: frame - scenes[3].startFrame, fps, config: { damping: 13, stiffness: 95 } });
  const stampSpring = spring({ frame: frame - scenes[4].startFrame, fps, config: { damping: 12, stiffness: 120 } });

  return (
    <AbsoluteFill
      className={`pro-frame ${isGain ? "is-gain" : "is-loss"}`}
      style={{
        "--result": resultColor,
        "--result-soft": resultSoftColor,
        "--brand": brandColor,
        transform: `translate(${cameraShake}px, ${-cameraShake * 0.55}px)`
      } as React.CSSProperties}
    >
      {input.voiceoverAudioUrl && <Audio src={input.voiceoverAudioUrl} />}
      <AbsoluteFill className="pro-world">
        <div className="pro-grid" />
        <MoneyRain amount={amount} value={value} multiple={multipleLabel} />
        <ChartRibbon isGain={isGain} />
        <div className="pro-color-wash" />
      </AbsoluteFill>
      <div className="pro-vignette" />
      <div className="pro-scanlines" />

      <div className="pro-topbar">
        <div>
          <strong>{input.ticker.toUpperCase()}</strong>
          <span>{company}</span>
        </div>
        <div>{startLabel} - TODAY</div>
      </div>
      <BrandBadge logoUrl={logoUrl} initials={brandInitials} ticker={input.ticker} />

      <SceneLayer scene={scenes[0]} className="pro-scene pro-hook">
        <div className="pro-kicker">stop scrolling</div>
        <div className="pro-hook-copy">
          <ProWords text={scenes[0].text} />
        </div>
      </SceneLayer>

      <SceneLayer scene={scenes[1]} className="pro-scene pro-setup">
        <div className="pro-label">if you invested</div>
        <div className="pro-amount">{amount}</div>
        <div className="pro-company" style={{ "--company-size": `${getCompanyFontSize(company)}px` } as React.CSSProperties}>
          <ProWords text={company} />
        </div>
        <div className="pro-date">in {input.year}</div>
      </SceneLayer>

      <SceneLayer scene={scenes[2]} className="pro-scene pro-friction">
        <div className="pro-rule-stack">
          {["no trading", "no perfect timing", "just holding"].map((line, index) => (
            <div key={line} className={frame > scenes[2].startFrame + index * 24 ? "visible" : ""}>
              {line}
            </div>
          ))}
        </div>
      </SceneLayer>

      <SceneLayer scene={scenes[3]} className="pro-scene pro-reveal">
        <div className="pro-label">today</div>
        <div className="pro-value" style={{ transform: `scale(${0.86 + revealSpring * 0.14})` }}>
          {value}
        </div>
        <div className="pro-subline">from one saved amount</div>
      </SceneLayer>

      <SceneLayer scene={scenes[4]} className="pro-scene pro-meaning">
        <div className="pro-meaning-line">that's</div>
        <div className="pro-stamp" style={{ transform: `rotate(-3deg) scale(${0.78 + stampSpring * 0.22})` }}>
          {multipleLabel}
        </div>
        <div className="pro-meaning-line">your money</div>
        <div className="pro-boring">one boring decision</div>
      </SceneLayer>

      <SceneLayer scene={scenes[5]} className="pro-scene pro-cta">
        <div className="pro-end-card">
          <BrandBadge logoUrl={logoUrl} initials={brandInitials} ticker={input.ticker} />
          <div className="pro-url">couldamade.com</div>
          <div className="pro-end-meta">{input.ticker.toUpperCase()} / {amount} to {value} / {multipleLabel}</div>
        </div>
      </SceneLayer>

      {activeScene && <WordCaption text={activeScene.text} opacity={captionOpacity} />}
      <div className="pro-disclaimer">{input.disclaimer}</div>
    </AbsoluteFill>
  );
}
