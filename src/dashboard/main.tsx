import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { CalendarPlus, Download, FileText, Layers, Play, RefreshCw, Search, Send, Shuffle, Sparkles } from "lucide-react";
import type { ContentItem, CreativeAngle, RenderJob, ScenarioInput, ScheduleEntry, VideoInput } from "../shared/types";
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

type ExternalScenario = {
  asset: string;
  ticker?: string;
  category?: string;
  startDate?: string;
  amountInvested: number;
  finalValue: number;
};

type CouldaMadeAsset = {
  asset: string;
  assetType: string;
  name?: string;
};

function App() {
  const [scenario, setScenario] = useState<ScenarioInput>(defaultScenario);
  const [ideas, setIdeas] = useState<VideoInput[]>([]);
  const [contentItems, setContentItems] = useState<ContentItem[]>([]);
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [jobs, setJobs] = useState<RenderJob[]>([]);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");
  const [lookupMessage, setLookupMessage] = useState("");
  const [assetResults, setAssetResults] = useState<CouldaMadeAsset[]>([]);
  const activeJob = useMemo(() => jobs.find((job) => job.status === "queued" || job.status === "rendering"), [jobs]);
  const completedCount = jobs.filter((job) => job.status === "done").length;

  async function refreshJobs() {
    const [jobsRes, contentRes, scheduleRes] = await Promise.all([
      fetch("/api/jobs"),
      fetch("/api/content/items"),
      fetch("/api/schedule/entries")
    ]);
    const data = (await jobsRes.json()) as { jobs: RenderJob[] };
    setJobs(data.jobs);
    setContentItems((await contentRes.json()) as ContentItem[]);
    setSchedule((await scheduleRes.json()) as ScheduleEntry[]);
  }

  useEffect(() => {
    void refreshJobs();
    void generateIdeas(defaultScenario);
  }, []);

  useEffect(() => {
    const id = window.setInterval(refreshJobs, activeJob ? 1500 : 5000);
    return () => window.clearInterval(id);
  }, [activeJob?.id]);

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
        date
      });
      const res = await fetch(`/api/external/calculate?${qs}`, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(await res.text());
      applyExternalScenario((await res.json()) as ExternalScenario);
      setLookupMessage("Pulled live calculation from CouldaMade.com.");
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

  async function searchCouldaMadeAssets() {
    if (!scenario.ticker.trim()) return;
    const res = await fetch(`/api/external/search?q=${encodeURIComponent(scenario.ticker)}`);
    if (!res.ok) return;
    setAssetResults((await res.json()) as CouldaMadeAsset[]);
  }

  function useAsset(asset: CouldaMadeAsset) {
    setScenario((prev) => ({
      ...prev,
      ticker: asset.asset,
      company: cleanCompanyName(asset.name ?? asset.asset),
      assetType: asset.assetType
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
      day: safeDate.getUTCDate()
    };
    setScenario(nextScenario);
    void generateIdeas(nextScenario);
  }

  async function scheduleContent(item: ContentItem) {
    const scheduledFor = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    await fetch("/api/schedule/entries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentItemId: item.id, platform: item.platform, scheduledFor })
    });
    await refreshJobs();
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
                <button className="icon-button compact" type="button" onClick={searchCouldaMadeAssets} aria-label="Search CouldaMade assets">
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
            {ideas.map((idea) => (
              <article className="idea-card" key={`${idea.ticker}-${idea.angle}`}>
                <div className="idea-top">
                  <span className="status done">{idea.angle}</span>
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
                    <button className="icon-button compact" type="button" onClick={() => scheduleContent(item)} aria-label="Schedule content">
                      <CalendarPlus size={18} />
                    </button>
                  </div>
                  <p className="library-copy">{item.caption}</p>
                </article>
              ))}
            </div>
          )}
          {schedule.length > 0 && (
            <div className="library-section">
              <h3>Schedule</h3>
              {schedule.slice(0, 8).map((entry) => (
                <article className="job-card" key={entry.id}>
                  <div className="job-main">
                    <div>
                      <h3>{entry.platform}</h3>
                      <p>{new Date(entry.scheduledFor).toLocaleString()} - {entry.status}</p>
                    </div>
                  </div>
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
