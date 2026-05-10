import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Download, Play, RefreshCw, Send } from "lucide-react";
import type { RenderJob, VideoInput } from "../shared/types";
import "./styles.css";

const defaultInput: VideoInput = {
  template: "couldamade-finance",
  ticker: "TSLA",
  company: "Tesla",
  assetType: "stock",
  amount: 1000,
  value: 55000,
  year: 2019,
  month: 1,
  day: 1,
  voiceover:
    "If you put one thousand dollars into Tesla in twenty nineteen and just left it alone, today it would be worth way more than most people expect. Same asset. Just time. Run yours now at couldamade.com.",
  caption: "If only we knew then. Run your own what-if at couldamade.com."
};

function App() {
  const [input, setInput] = useState<VideoInput>(defaultInput);
  const [jobs, setJobs] = useState<RenderJob[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const activeJob = useMemo(() => jobs.find((job) => job.status === "queued" || job.status === "rendering"), [jobs]);

  async function refreshJobs() {
    const res = await fetch("/api/jobs");
    const data = (await res.json()) as { jobs: RenderJob[] };
    setJobs(data.jobs);
  }

  useEffect(() => {
    void refreshJobs();
    const id = window.setInterval(refreshJobs, activeJob ? 1500 : 5000);
    return () => window.clearInterval(id);
  }, [activeJob?.id]);

  async function submitRender(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input)
      });
      if (!res.ok) throw new Error(await res.text());
      await refreshJobs();
    } finally {
      setSubmitting(false);
    }
  }

  function update<K extends keyof VideoInput>(key: K, value: VideoInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <main className="app-shell">
      <section className="panel composer">
        <div className="panel-header">
          <div>
            <p className="eyebrow">CouldaMade</p>
            <h1>Video Engine</h1>
          </div>
          <button className="icon-button" type="button" onClick={refreshJobs} aria-label="Refresh jobs">
            <RefreshCw size={20} />
          </button>
        </div>

        <form onSubmit={submitRender} className="form-grid">
          <label>
            Ticker
            <input value={input.ticker} onChange={(e) => update("ticker", e.target.value)} />
          </label>
          <label>
            Company
            <input value={input.company} onChange={(e) => update("company", e.target.value)} />
          </label>
          <label>
            Amount invested
            <input
              type="number"
              value={input.amount}
              onChange={(e) => update("amount", Number(e.target.value))}
            />
          </label>
          <label>
            Current value
            <input
              type="number"
              value={input.value}
              onChange={(e) => update("value", Number(e.target.value))}
            />
          </label>
          <label>
            Year
            <input type="number" value={input.year} onChange={(e) => update("year", Number(e.target.value))} />
          </label>
          <label>
            Month
            <input type="number" min={1} max={12} value={input.month} onChange={(e) => update("month", Number(e.target.value))} />
          </label>
          <label>
            Day
            <input type="number" min={1} max={31} value={input.day} onChange={(e) => update("day", Number(e.target.value))} />
          </label>
          <label>
            Asset type
            <input value={input.assetType} onChange={(e) => update("assetType", e.target.value)} />
          </label>
          <label className="wide">
            Voiceover script
            <textarea value={input.voiceover} onChange={(e) => update("voiceover", e.target.value)} rows={5} />
          </label>
          <label className="wide">
            Caption
            <textarea value={input.caption} onChange={(e) => update("caption", e.target.value)} rows={3} />
          </label>

          <button className="primary-button wide" disabled={submitting} type="submit">
            {submitting ? <RefreshCw size={18} className="spin" /> : <Send size={18} />}
            Queue render
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Queue</p>
            <h2>Render Jobs</h2>
          </div>
        </div>

        <div className="job-list">
          {jobs.length === 0 ? (
            <div className="empty">
              <Play size={26} />
              <p>No renders yet. Queue your first video.</p>
            </div>
          ) : (
            jobs.map((job) => <JobCard key={job.id} job={job} />)
          )}
        </div>
      </section>
    </main>
  );
}

function JobCard({ job }: { job: RenderJob }) {
  const title = `${job.input.ticker.toUpperCase()} / ${job.input.company}`;
  return (
    <article className="job-card">
      <div className="job-main">
        <div>
          <h3>{title}</h3>
          <p>{new Date(job.createdAt).toLocaleString()}</p>
        </div>
        <span className={`status ${job.status}`}>{job.status}</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${Math.round(job.progress * 100)}%` }} />
      </div>
      {job.error && <p className="error">{job.error}</p>}
      {job.outputUrl && (
        <a className="download-link" href={job.outputUrl} download>
          <Download size={18} />
          Download MP4
        </a>
      )}
    </article>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
