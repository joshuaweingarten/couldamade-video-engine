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

function currencyGrowthPath(frame: number, startFrame: number): string {
  const p = interpolate(frame, [startFrame, startFrame + 110], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp"
  });
  const points = [
    [40, 1600],
    [150, 1340],
    [270, 1440],
    [390, 1040],
    [500, 1160],
    [630, 900],
    [740, 1060],
    [860, 720],
    [970, 580],
    [1110, 450]
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

function getBrandInitials(company: string, ticker: string): string {
  const words = company.replace(/[^a-zA-Z0-9 ]/g, "").split(" ").filter(Boolean);
  if (words.length >= 2) return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
  return ticker.slice(0, 2).toUpperCase();
}

function getScene(input: VideoInput, index: number, fallback: [number, number]) {
  return input.scenes?.[index] ?? { text: "", startFrame: fallback[0], endFrame: fallback[1] };
}

function getCompanyFontSize(company: string): number {
  const words = company.split(/\s+/).filter(Boolean);
  const longestWord = Math.max(...words.map((word) => word.length), 1);
  const sizeForLongestWord = Math.floor(920 / (longestWord * 0.62));
  const sizeForFullName = Math.floor(122 - Math.max(0, company.length - 18) * 1.6);
  return Math.max(58, Math.min(122, sizeForLongestWord, sizeForFullName));
}

function CompanyName({ company }: { company: string }) {
  const words = company.split(/\s+/).filter(Boolean);
  return (
    <div className="company" style={{ "--company-font-size": `${getCompanyFontSize(company)}px` } as React.CSSProperties}>
      {words.map((word, index) => (
        <span className="company-word" key={`${word}-${index}`}>
          {word}
        </span>
      ))}
    </div>
  );
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

function MarketTape({ ticker, company, value, multiple }: { ticker: string; company: string; value: string; multiple: string }) {
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
              {ticker.toUpperCase()} {company} {value} {multiple}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

function FloatingNumbers({ amount, value, multiple }: { amount: string; value: string; multiple: string }) {
  const frame = useCurrentFrame();
  const items = [amount, value, multiple, "HOLD", amount, value, multiple, "TODAY"];
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

function LogoImage({ logoUrl, initials }: { logoUrl?: string; initials: string }) {
  const [failed, setFailed] = useState(false);
  if (logoUrl && !failed) {
    return <img src={logoUrl} onError={() => setFailed(true)} />;
  }
  return <span>{initials}</span>;
}

function BrandIconSvg({ ticker }: { ticker: string }) {
  const icon = getBrandIcon(ticker);
  if (!icon) return null;
  return (
    <svg
      className="brand-icon-svg"
      viewBox={icon.viewBox}
      role="img"
      aria-label={icon.title}
      style={{ display: "block", width: "100%", height: "100%", fill: `#${icon.hex ?? "111111"}` }}
      dangerouslySetInnerHTML={{ __html: icon.body }}
    />
  );
}

function BrandMark({ logoUrl, initials, ticker }: { logoUrl?: string; initials: string; ticker: string }) {
  const hasLocalIcon = Boolean(getBrandIcon(ticker));
  if (hasLocalIcon || logoUrl) {
    return (
      <div className="brand-badge has-logo">
        {hasLocalIcon ? <BrandIconSvg ticker={ticker} /> : <LogoImage logoUrl={logoUrl} initials={initials} />}
      </div>
    );
  }
  return (
    <div className="brand-badge">
      <span>{initials}</span>
    </div>
  );
}

function EndLogo({ logoUrl, initials, ticker }: { logoUrl?: string; initials: string; ticker: string }) {
  const hasLocalIcon = Boolean(getBrandIcon(ticker));
  if (hasLocalIcon || logoUrl) {
    return (
      <div className="end-logo has-logo">
        {hasLocalIcon ? <BrandIconSvg ticker={ticker} /> : <LogoImage logoUrl={logoUrl} initials={initials} />}
      </div>
    );
  }
  return <div className="end-logo">{initials}</div>;
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
  const scene0 = getScene(input, 0, [0, 145]);
  const scene1 = getScene(input, 1, [135, 270]);
  const scene2 = getScene(input, 2, [260, 360]);
  const scene3 = getScene(input, 3, [340, 500]);
  const scene4 = getScene(input, 4, [490, 610]);
  const scene5 = getScene(input, 5, [600, 660]);
  const cameraX = Math.sin(frame / 58) * 18;
  const cameraY = Math.cos(frame / 72) * 24;
  const cameraScale = 1.03 + Math.sin(frame / 115) * 0.018;
  const styleName = input.visualStyle ?? "terminal";
  const presetName = input.qualityPreset ?? "punchy";
  const brandColor = getBrandColor(input.ticker) ?? input.brandColor ?? input.accentColor;
  const multipleLabel = formatMultiple(growth);
  const isGain = growth >= 1;
  const resultColor = isGain ? "#28f296" : "#ff4d5d";
  const resultSoftColor = isGain ? "#18b978" : "#a72a38";
  const resultHotColor = isGain ? "#f2d766" : "#ffcf5a";
  const brandInitials = getBrandInitials(input.company, input.ticker);
  const logoUrl = input.logoUrl?.trim() || getBrandLogoUrl(input.ticker);

  const pulse = spring({ frame, fps, config: { damping: 18, stiffness: 80 } });
  const resultScale = spring({
    frame: frame - 330,
    fps,
    config: { damping: 16, stiffness: 90 }
  });

  return (
    <AbsoluteFill
      className={`video-frame result-${isGain ? "gain" : "loss"} style-${styleName} preset-${presetName}`}
      style={{
        "--accent": resultColor,
        "--accent-soft": resultSoftColor,
        "--hot": resultHotColor,
        "--brand": brandColor
      } as React.CSSProperties}
    >
      {input.voiceoverAudioUrl && <Audio src={input.voiceoverAudioUrl} />}
      <AbsoluteFill
        className="motion-world"
        style={{ transform: `translate(${cameraX}px, ${cameraY}px) scale(${cameraScale})` }}
      >
        <div className="grid-bg" />
        <MarketTape ticker={input.ticker} company={input.company} value={value} multiple={multipleLabel} />
        <FloatingNumbers amount={amount} value={value} multiple={multipleLabel} />
        <svg className="chart-line" viewBox="0 0 1080 1920">
          <path d={currencyGrowthPath(frame, 10)} />
        </svg>
        <div className="price-wash" />
      </AbsoluteFill>
      <div className="vignette" />
      <div className="scanline" />
      <div className="cold-open" style={{ opacity: sceneOpacity(frame, 0, 52) }}>
        <span>{input.angle === "regret" ? "missed" : input.angle}</span>
      </div>

      <SceneShell
        opacity={sceneOpacity(frame, scene0.startFrame, scene0.endFrame)}
        progress={sceneProgress(frame, scene0.startFrame, scene0.endFrame)}
        className="scene-intro"
      >
        <div className="top-market">
          <div className="ticker">{input.ticker.toUpperCase()}</div>
          <div className="date">{startLabel} - TODAY</div>
        </div>
        <BrandMark logoUrl={logoUrl} initials={brandInitials} ticker={input.ticker} />
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
          <strong>{multipleLabel}</strong>
        </div>
      </SceneShell>

      <SceneShell
        opacity={sceneOpacity(frame, scene1.startFrame, scene1.endFrame)}
        progress={sceneProgress(frame, scene1.startFrame, scene1.endFrame)}
        className="scene-buy"
      >
        <div className="center-stack">
          <div className="eyebrow">if you put</div>
          <div className="big-money">{amount}</div>
          <div className="company-lockup">
            <div className="eyebrow">into</div>
            <CompanyName company={input.company} />
            <div className="eyebrow">in {startLabel}</div>
          </div>
        </div>
        <div className="receipt-panel">
          <div><span>asset</span><strong>{input.ticker.toUpperCase()}</strong></div>
          <div><span>entry</span><strong>{startLabel}</strong></div>
          <div><span>stake</span><strong>{amount}</strong></div>
        </div>
      </SceneShell>

      <SceneShell
        opacity={sceneOpacity(frame, scene2.startFrame, scene2.endFrame)}
        progress={sceneProgress(frame, scene2.startFrame, scene2.endFrame)}
        className="scene-hold"
      >
        <div className="center-stack pause">
          <div className="eyebrow">and just held it</div>
          <div className="pause-amount">{amount}</div>
        </div>
        <div className="hold-timeline">
          {["buy", "wait", "ignore noise", "today"].map((label, index) => (
            <div key={label} className={frame > scene2.startFrame + 18 + index * 18 ? "active" : ""}>
              <i />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </SceneShell>

      <SceneShell
        opacity={sceneOpacity(frame, scene3.startFrame, scene3.endFrame)}
        progress={sceneProgress(frame, scene3.startFrame, scene3.endFrame)}
        className="scene-result"
      >
        <div className="center-stack">
          <div className="eyebrow">would be worth</div>
          <div
            className="result-money"
            style={{ transform: `scale(${0.85 + resultScale * 0.15})` }}
          >
            {value}
          </div>
          <div className="gain-pill">about {multipleLabel} your money</div>
          <div className="eyebrow">today</div>
        </div>
        <div className="burst-ring" />
      </SceneShell>

      <SceneShell
        opacity={sceneOpacity(frame, scene4.startFrame, scene4.endFrame)}
        progress={sceneProgress(frame, scene4.startFrame, scene4.endFrame)}
        className="scene-lesson"
      >
        <div className="center-stack perspective">
          <div className="perspective-line">same asset.</div>
          <div className="perspective-line accent">just time.</div>
        </div>
        <div className="split-comparison">
          <div><span>trading</span><strong>noise</strong></div>
          <div><span>holding</span><strong>{multipleLabel}</strong></div>
        </div>
      </SceneShell>

      <SceneShell
        opacity={sceneOpacity(frame, scene5.startFrame, scene5.endFrame)}
        progress={sceneProgress(frame, scene5.startFrame, scene5.endFrame)}
        className="scene-cta"
      >
        <div className="end-card">
          <EndLogo logoUrl={logoUrl} initials={brandInitials} ticker={input.ticker} />
          <div className="brand">couldamade.com</div>
          <div className="cta-text">run yours now</div>
          <div className="end-meta">{input.ticker.toUpperCase()} / {value} / {multipleLabel}</div>
        </div>
      </SceneShell>

      {activeScene && (
        <SpokenCaption text={activeScene.text} opacity={captionOpacity} />
      )}
      <div className="disclaimer">{input.disclaimer}</div>
    </AbsoluteFill>
  );
}
