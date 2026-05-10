import cors from "cors";
import express from "express";
import path from "node:path";
import { videoInputSchema } from "../shared/types";
import { enqueueRender } from "./queue";
import { getJob, listJobs, loadJobs } from "./jobStore";

const PORT = Number(process.env.PORT ?? 8787);

await loadJobs();

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use("/renders", express.static(path.resolve("renders")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "couldamade-video-engine" });
});

app.get("/api/jobs", (_req, res) => {
  res.json({ jobs: listJobs() });
});

app.get("/api/jobs/:id", (req, res) => {
  const job = getJob(req.params.id);
  if (!job) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  res.json({ job });
});

app.post("/api/render", async (req, res) => {
  const parsed = videoInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid video input", details: parsed.error.flatten() });
    return;
  }

  const job = await enqueueRender(parsed.data);
  res.status(202).json({ job });
});

app.use(express.static(path.resolve("dist/dashboard")));

app.listen(PORT, "0.0.0.0", () => {
  console.log(`CouldaMade video engine API listening on http://0.0.0.0:${PORT}`);
});
