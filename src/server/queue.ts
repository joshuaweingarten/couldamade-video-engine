import crypto from "node:crypto";
import type { VideoInput, RenderJob } from "../shared/types";
import { putJob, updateJob } from "./jobStore";
import { renderJobToFile } from "./render";

const queue: string[] = [];
const pendingJobs = new Map<string, RenderJob>();
let running = false;

export async function enqueueRender(input: VideoInput): Promise<RenderJob> {
  const now = new Date().toISOString();
  const job: RenderJob = {
    id: crypto.randomUUID(),
    status: "queued",
    input,
    createdAt: now,
    updatedAt: now,
    progress: 0
  };

  pendingJobs.set(job.id, job);
  queue.push(job.id);
  await putJob(job);
  void processQueue();
  return job;
}

async function processQueue(): Promise<void> {
  if (running) return;
  running = true;

  try {
    while (queue.length > 0) {
      const id = queue.shift();
      if (!id) continue;
      const job = pendingJobs.get(id);
      if (!job) continue;

      await updateJob(id, { status: "rendering", progress: 0.02, error: undefined });
      try {
        const result = await renderJobToFile(job, asyncProgress(id));
        await updateJob(id, {
          status: "done",
          progress: 1,
          outputPath: result.outputPath,
          outputUrl: result.outputUrl
        });
      } catch (error) {
        await updateJob(id, {
          status: "failed",
          progress: 0,
          error: error instanceof Error ? error.message : String(error)
        });
      } finally {
        pendingJobs.delete(id);
      }
    }
  } finally {
    running = false;
  }
}

function asyncProgress(id: string): (progress: number) => void {
  let lastWrite = 0;
  return (progress: number) => {
    const now = Date.now();
    if (now - lastWrite < 750 && progress < 1) return;
    lastWrite = now;
    void updateJob(id, { progress: Math.max(0.02, Math.min(0.99, progress)) });
  };
}
