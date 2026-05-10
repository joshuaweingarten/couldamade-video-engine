import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Download, FileText, Layers, Play, RefreshCw, Send, Sparkles } from "lucide-react";
import type { CreativeAngle, RenderJob, ScenarioInput, VideoInput } from "../shared/types";
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

function App() {
  const [scenario, setScenario] = useState<ScenarioInput>(defaultScenario);
  const [ideas, setIdeas] = useState<VideoInput[]>([]);
  const [jobs, setJobs] = useState<RenderJob[]>([]);
  const [busy, setBusy] = useState(false);
  const activeJob = useMemo(() => jobs.find((job) => job.status === "queued" || job.status === "rendering"), [jobs]);
  const completedCount = jobs.filter((job) => job.status === "done").length;

  async function refreshJobs() {
    const res = await fetch("/api/jobs");
    const data = (await res.json()) as { jobs: RenderJob[] };
    setJobs(data.jobs);
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
    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(video)
      });
      if (!res.ok) throw new Error(await res.text());
      await refreshJobs();
    } finally {
      setBusy(false);
    }
  }

  async function queueBatch() {
    setBusy(true);
    try {
      const res = await fetch("/api/render/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videos: ideas })
      });
      if (!res.ok) throw new Error(await res.text());
      await refreshJobs();
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
              <input value={scenario.ticker} onChange={(e) => update("ticker", e.target.value)} />
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
