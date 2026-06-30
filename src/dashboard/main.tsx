import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Download, FileText, Layers, Play, RefreshCw, Search, Send, Shuffle, Sparkles, Trash2 } from "lucide-react";
import type { ContentItem, CreativeAngle, RenderJob, ScenarioInput, VideoInput } from "../shared/types";
import "./styles.css";

const defaultScenario: ScenarioInput = {
  ticker: "TSLA",
  company: "Tesla",
  assetType: "stock",
  amount: 1000,
  value: 55000,
  year: 2019,
  month: 1,
  day: 1,
  platform: "tiktok",
  angles: ["regret", "shock", "lesson"]
};

const angleOptions: Array<{ value: CreativeAngle; label: string }> = [
  { value: "regret", label: "Regret" },
  { value: "receipt", label: "Receipt" },
  { value: "shock", label: "Shock" },
  { value: "lesson", label: "Lesson" },
  { value: "comeback", label: "Comeback" }
];

function getIdeaLabel(idea: VideoInput): string {
  return idea.template === "couldamade-pro" ? "Pro template" : idea.angle;
}

type ExternalScenario = {
  asset: string;
  ticker?: string;
  category?: string;
  startDate?: string;
  amountInvested: number;
  finalValue: number;
  dataSource?: string;
  logoUrl?: string;
  chartPoints?: Array<{ date: string; close: number }>;
};

type CouldaMadeAsset = {
  asset: string;
  assetType: string;
  name?: string;
  logoUrl?: string;
};

function App() {
  const [scenario, setScenario] = useState<ScenarioInput>(defaultScenario);
  const [ideas, setIdeas] = useState<VideoInput[]>([]);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [jobs, setJobs] = useState<RenderJob[]>([]);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [lookupMessage, setLookupMessage] = useState("");
  const [assetResults, setAssetResults] = useState<CouldaMadeAsset[]>([]);
  const activeJob = useMemo(() => jobs.find((job) => job.status === "queued" || job.status === "rendering"), [jobs]);
  const completedCount = jobs.filter((job) => job.status === "done").length;

  async function refreshJobs() {
    const [jobsRes, contentRes] = await Promise.all([
      fetch("/api/jobs"),
      fetch("/api/content/items")
    ]);
    const data = (await jobsRes.json()) as { jobs: RenderJob[] };
    setJobs(data.jobs);
    setContentItems((await contentRes.json()) as ContentItem[]);
  }

  async function clearStuckJobs() {
    setBusy(true);
    setActionError("");
    try {
      const res = await fetch("/api/jobs/cleanup", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { jobs: RenderJob[] };
      setJobs(data.jobs);
      await refreshJobs();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not clear stuck jobs.");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    void refreshJobs();
    void generateIdeas(defaultScenario);
  }, []);

  useEffect(() => {
    const id = window.setInterval(refreshJobs, activeJob ? 1500 : 5000);
    return () => window.clearInterval(id);
  }, [activeJob?.id]);

  useEffect(() => {
    const ticker = scenario.ticker.trim();
    if (ticker.length < 1) {
      setAssetResults([]);
      return;
    }
    const id = window.setTimeout(() => {
      void searchCouldaMadeAssets(ticker, false);
    }, 250);
    return () => window.clearTimeout(id);
  }, [scenario.ticker]);

  async function generateIdeas(nextScenario = scenario) {
    setBusy(true);
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextScenario)
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { videos: VideoInput[] };
      setIdeas(data.videos);
    } finally {
      setBusy(false);
    }
  }

  async function queueOne(video: VideoInput) {
    setBusy(true);
    setActionError("");
    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(video)
      });
      if (!res.ok) throw new Error(await res.text());
      await fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(video)
      });
      await refreshJobs();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not start render.");
    } finally {
      setBusy(false);
    }
  }

  async function queueBatch() {
    setBusy(true);
    setActionError("");
    try {
      const res = await fetch("/api/render/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videos: ideas })
      });
      if (!res.ok) throw new Error(await res.text());
      await Promise.all(ideas.map((video) => fetch("/api/videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(video)
      })));
      await refreshJobs();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Could not start batch render.");
    } finally {
      setBusy(false);
    }
  }

  function update<K extends keyof ScenarioInput>(key: K, value: ScenarioInput[K]) {
    setScenario((prev) => ({ ...prev, [key]: value }));
  }

  function toggleAngle(angle: CreativeAngle) {
    setScenario((prev) => {
      const angles = prev.angles.includes(angle)
        ? prev.angles.filter((item) => item !== angle)
        : [...prev.angles, angle];
      return { ...prev, angles: angles.length ? angles : [angle] };
    });
  }

  async function saveIdeasToLibrary() {
    setBusy(true);
    try {
      const res = await fetch("/api/content/generate-finance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(scenario)
      });
      if (!res.ok) throw new Error(await res.text());
      const items = (await res.json()) as ContentItem[];
      setIdeas(items.map((item) => item.video));
      await refreshJobs();
    } finally {
      setBusy(false);
    }
  }

  async function calculateFromCouldaMade() {
    setBusy(true);
    setLookupMessage("Calculating with CouldaMade.com...");
    try {
      const date = `${scenario.year}-${String(scenario.month).padStart(2, "0")}-${String(scenario.day).padStart(2, "0")}`;
      const qs = new URLSearchParams({
        asset: scenario.ticker,
        assetType: scenario.assetType,
        amount: String(scenario.amount),
        date,
        currentValue: String(scenario.value)
      });
      const res = await fetch(`/api/external/calculate?${qs}`, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(await res.text());
      const external = (await res.json()) as ExternalScenario;
      applyExternalScenario(external);
      setLookupMessage(external.dataSource?.includes("fallback")
        ? "Calculated with backup stock data because CouldaMade/Yahoo was rate-limited."
        : "Pulled live calculation from CouldaMade.com.");
    } catch (error) {
      setLookupMessage(error instanceof Error ? error.message : "CouldaMade lookup failed.");
    } finally {
      setBusy(false);
    }
  }

  async function randomFromCouldaMade() {
    setBusy(true);
    setLookupMessage("Finding a random CouldaMade scenario...");
    try {
      const res = await fetch("/api/external/random", { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(await res.text());
      applyExternalScenario((await res.json()) as ExternalScenario);
      setLookupMessage("Loaded a random scenario from CouldaMade.com.");
    } catch (error) {
      setLookupMessage(error instanceof Error ? error.message : "CouldaMade random lookup failed.");
    } finally {
      setBusy(false);
    }
  }

  async function searchCouldaMadeAssets(query = scenario.ticker, showMessage = true) {
    const q = query.trim();
    if (!q) return;
    if (showMessage) setLookupMessage("Searching assets...");
    try {
      const res = await fetch(`/api/external/search?q=${encodeURIComponent(q)}`);
      if (!res.ok) throw new Error(await res.text());
      const results = (await res.json()) as CouldaMadeAsset[];
      setAssetResults(results);
      if (showMessage) setLookupMessage(results.length ? "Choose a company below." : "No matching companies found.");
    } catch (error) {
      if (showMessage) setLookupMessage(error instanceof Error ? error.message : "Asset search failed.");
    }
  }

  function useAsset(asset: CouldaMadeAsset) {
    setScenario((prev) => ({
      ...prev,
      ticker: asset.asset,
      company: cleanCompanyName(asset.name ?? asset.asset),
      assetType: asset.assetType,
      logoUrl: asset.logoUrl
    }));
    setAssetResults([]);
  }

  function applyExternalScenario(external: ExternalScenario) {
    const date = external.startDate ? new Date(external.startDate) : new Date(Date.UTC(scenario.year, scenario.month - 1, scenario.day));
    const safeDate = Number.isNaN(date.getTime()) ? new Date(Date.UTC(scenario.year, scenario.month - 1, scenario.day)) : date;
    const assetType = external.category ?? scenario.assetType;
    const ticker = external.ticker ?? external.asset;
    const nextScenario: ScenarioInput = {
      ...scenario,
      ticker: assetType === "stock" ? ticker.toUpperCase() : ticker,
      company: cleanCompanyName(external.asset),
      assetType,
      amount: Math.round(external.amountInvested),
      value: Math.round(external.finalValue),
      year: safeDate.getUTCFullYear(),
      month: safeDate.getUTCMonth() + 1,
      day: safeDate.getUTCDate(),
      logoUrl: external.logoUrl,
      chartPoints: external.chartPoints
    };
    setScenario(nextScenario);
    void generateIdeas(nextScenario);
  }

  return (
    <main className="app-shell">
      <section className="hero-band">
        <div>
          <p className="eyebrow">CouldaMade</p>
          <h1>Video Factory</h1>
        </div>
        <div className="stats">
          <Stat label="Ideas" value={ideas.length} />
          <Stat label="Queued / rendering" value={activeJob ? 1 : 0} />
          <Stat label="Finished" value={completedCount} />
        </div>
      </section>

      <section className="workspace">
        <section className="panel composer">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Scenario</p>
              <h2>Build videos</h2>
            </div>
            <button className="icon-button" type="button" onClick={refreshJobs} aria-label="Refresh jobs">
              <RefreshCw size={20} />
            </button>
          </div>

          <form
            className="form-grid"
            onSubmit={(event) => {
              event.preventDefault();
              void generateIdeas();
            }}
          >
            <label>
              Ticker
              <div className="input-action">
                <input value={scenario.ticker} onChange={(e) => update("ticker", e.target.value.toUpperCase())} />
                <button className="icon-button compact" type="button" onClick={() => searchCouldaMadeAssets()} aria-label="Search CouldaMade assets">
                  <Search size={17} />
                </button>
              </div>
            </label>
            <label>
              Company
              <input value={scenario.company} onChange={(e) => update("company", e.target.value)} />
            </label>
            <label>
              Amount invested
              <input type="number" value={scenario.amount} onChange={(e) => update("amount", Number(e.target.value))} />
            </label>
            <label>
              Current value
              <input type="number" value={scenario.value} onChange={(e) => update("value", Number(e.target.value))} />
            </label>
            <label>
              Year
              <input type="number" value={scenario.year} onChange={(e) => update("year", Number(e.target.value))} />
            </label>
            <label>
              Month
              <input type="number" min={1} max={12} value={scenario.month} onChange={(e) => update("month", Number(e.target.value))} />
            </label>
            <label>
              Day
              <input type="number" min={1} max={31} value={scenario.day} onChange={(e) => update("day", Number(e.target.value))} />
            </label>
            <label>
              Asset type
              <input value={scenario.assetType} onChange={(e) => update("assetType", e.target.value)} />
            </label>

            {assetResults.length > 0 && (
              <div className="wide asset-results">
                {assetResults.slice(0, 5).map((asset) => (
                  <button key={`${asset.asset}-${asset.assetType}`} type="button" onClick={() => useAsset(asset)}>
                    <strong>{asset.asset}</strong>
                    <span>{asset.name ?? asset.assetType}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="wide lookup-actions">
              <button className="secondary-button" disabled={busy} type="button" onClick={calculateFromCouldaMade}>
                <RefreshCw size={18} />
                Calculate from CouldaMade
              </button>
              <button className="secondary-button" disabled={busy} type="button" onClick={randomFromCouldaMade}>
                <Shuffle size={18} />
                Random scenario
              </button>
            </div>
            {lookupMessage && <p className="wide lookup-message">{lookupMessage}</p>}

            <div className="wide">
              <p className="field-label">Angles</p>
              <div className="angle-grid">
                {angleOptions.map((angle) => (
                  <button
                    key={angle.value}
                    type="button"
                    className={scenario.angles.includes(angle.value) ? "angle active" : "angle"}
                    onClick={() => toggleAngle(angle.value)}
                  >
                    {angle.label}
                  </button>
                ))}
              </div>
            </div>

            <button className="primary-button wide" disabled={busy} type="submit">
              {busy ? <RefreshCw size={18} className="spin" /> : <Sparkles size={18} />}
              Generate video ideas
            </button>
            <button className="secondary-button wide" disabled={busy} type="button" onClick={saveIdeasToLibrary}>
              <FileText size={18} />
              Save ideas to content library
            </button>
            {actionError && <p className="wide error">{actionError}</p>}
          </form>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Creative</p>
              <h2>Ready to render</h2>
            </div>
            <button className="secondary-button" type="button" onClick={queueBatch} disabled={busy || ideas.length === 0}>
              <Layers size={18} />
              Queue all
            </button>
          </div>

          <div className="idea-list">
            {ideas.map((idea, index) => (
              <article className={idea.template === "couldamade-pro" ? "idea-card pro-idea" : "idea-card"} key={`${idea.template}-${idea.ticker}-${idea.angle}-${index}`}>
                <div className="idea-top">
                  <span className={idea.template === "couldamade-pro" ? "status pro-status" : "status done"}>{getIdeaLabel(idea)}</span>
                  <button className="icon-button compact" type="button" onClick={() => queueOne(idea)} aria-label="Queue video">
                    <Send size={18} />
                  </button>
                </div>
                <h3>{idea.hook}</h3>
                <p>{idea.voiceover}</p>
                <div className="caption-box">
                  <FileText size={16} />
                  {idea.caption}
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="panel library">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Library</p>
            <h2>Render jobs</h2>
          </div>
          <div className="header-actions">
            <button className="secondary-button" type="button" onClick={clearStuckJobs} disabled={busy || jobs.length === 0}>
              <Trash2 size={18} />
              Clear stuck
            </button>
            <button className="icon-button" type="button" onClick={refreshJobs} aria-label="Refresh jobs">
              <RefreshCw size={20} />
            </button>
          </div>
        </div>

        <div className="job-list">
          {contentItems.length > 0 && (
            <div className="library-section">
              <h3>Content library</h3>
              {contentItems.slice(0, 8).map((item) => (
                <article className="job-card" key={item.id}>
                  <div className="job-main">
                    <div>
                      <h3>{item.hook}</h3>
                      <p>{item.platform} - {item.status}</p>
                    </div>
                  </div>
                  <p className="library-copy">{item.caption}</p>
                </article>
              ))}
            </div>
          )}
          {jobs.length === 0 ? (
            <div className="empty">
              <Play size={26} />
              <p>No renders yet. Generate ideas, then queue one.</p>
            </div>
          ) : (
            jobs.map((job) => <JobCard key={job.id} job={job} />)
          )}
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function JobCard({ job }: { job: RenderJob }) {
  const title = `${job.input.ticker.toUpperCase()} / ${job.input.company}`;
  return (
    <article className="job-card">
      <div className="job-main">
        <div>
          <h3>{title}</h3>
          <p>{job.input.angle} - {new Date(job.createdAt).toLocaleString()}</p>
        </div>
        <span className={`status ${job.status}`}>{job.status}</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${Math.round(job.progress * 100)}%` }} />
      </div>
      {job.error && <p className="error">{job.error}</p>}
      {job.outputUrl && (
        <div className="download-row">
          <a className="download-link" href={job.outputUrl} download>
            <Download size={18} />
            MP4
          </a>
          {job.captionUrl && (
            <a className="download-link" href={job.captionUrl} download>
              <FileText size={18} />
              SRT
            </a>
          )}
          {job.metadataUrl && (
            <a className="download-link" href={job.metadataUrl} download>
              <FileText size={18} />
              JSON
            </a>
          )}
        </div>
      )}
    </article>
  );
}

createRoot(document.getElementById("root")!).render(<App />);

function cleanCompanyName(raw: string): string {
  return raw
    .replace(/,?\s+(Inc\.?|Corp\.?|Corporation|Ltd\.?|Limited|LLC|L\.L\.C\.|PLC|S\.A\.|N\.V\.|Holdings?|Group|Co\.?)$/i, "")
    .trim();
}
