import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RenderJob } from "../shared/types";

const DATA_DIR = path.resolve("data");
const JOBS_FILE = path.join(DATA_DIR, "jobs.json");

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
