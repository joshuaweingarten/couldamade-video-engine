import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RenderJob } from "../shared/types";

const DATA_DIR = path.resolve("data");
const JOBS_FILE = path.join(DATA_DIR, "jobs.json");
const STALE_RENDER_MS = 45 * 60 * 1000;

let jobs = new Map<string, RenderJob>();

export async function loadJobs(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    const raw = await readFile(JOBS_FILE, "utf8");
    const parsed = JSON.parse(raw) as RenderJob[];
    jobs = new Map(parsed.map((job) => [job.id, job]));
  } catch {
    jobs = new Map();
  }
}

export async function saveJobs(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  const ordered = [...jobs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  await writeFile(JOBS_FILE, JSON.stringify(ordered, null, 2));
}

export function listJobs(): RenderJob[] {
  return [...jobs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getJob(id: string): RenderJob | undefined {
  return jobs.get(id);
}

export async function putJob(job: RenderJob): Promise<RenderJob> {
  jobs.set(job.id, job);
  await saveJobs();
  return job;
}

export async function updateJob(id: string, patch: Partial<RenderJob>): Promise<RenderJob | undefined> {
  const existing = jobs.get(id);
  if (!existing) return undefined;
  const updated = {
    ...existing,
    ...patch,
    updatedAt: new Date().toISOString()
  };
  jobs.set(id, updated);
  await saveJobs();
  return updated;
}

export async function failInterruptedJobs(): Promise<number> {
  let changed = 0;
  const now = new Date().toISOString();
  for (const [id, job] of jobs) {
    if (job.status !== "queued" && job.status !== "rendering") continue;
    jobs.set(id, {
      ...job,
      status: "failed",
      progress: 0,
      error: "Render was interrupted before it finished. Start a new render for this video.",
      updatedAt: now
    });
    changed += 1;
  }
  if (changed > 0) await saveJobs();
  return changed;
}

export async function failStaleJobs(maxAgeMs = STALE_RENDER_MS): Promise<number> {
  let changed = 0;
  const nowMs = Date.now();
  const now = new Date(nowMs).toISOString();
  for (const [id, job] of jobs) {
    if (job.status !== "queued" && job.status !== "rendering") continue;
    const updatedMs = Date.parse(job.updatedAt || job.createdAt);
    if (Number.isNaN(updatedMs) || nowMs - updatedMs < maxAgeMs) continue;
    jobs.set(id, {
      ...job,
      status: "failed",
      progress: 0,
      error: "Render took too long without progress and was marked as stuck. Start a new render for this video.",
      updatedAt: now
    });
    changed += 1;
  }
  if (changed > 0) await saveJobs();
  return changed;
}

export async function clearFailedJobs(): Promise<number> {
  const before = jobs.size;
  jobs = new Map([...jobs].filter(([, job]) => job.status !== "failed"));
  const cleared = before - jobs.size;
  if (cleared > 0) await saveJobs();
  return cleared;
}
