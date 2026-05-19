import cors from "cors";
import express from "express";
import path from "node:path";
import {
  batchRenderSchema,
  createContentItemSchema,
  createSavedVideoSchema,
  createScheduleEntrySchema,
  scenarioSchema,
  updateContentItemSchema,
  updateScheduleEntrySchema,
  videoInputSchema
} from "../shared/types";
import { buildVideoIdeas } from "../shared/contentEngine";
import { enqueueRender } from "./queue";
import { getJob, listJobs, loadJobs } from "./jobStore";
import {
  createContentItem,
  createSavedVideo,
  createScheduleEntry,
  deleteContentItem,
  deleteSavedVideo,
  deleteScheduleEntry,
  getContentItem,
  listContentItems,
  listSavedVideos,
  listScheduleEntries,
  loadAppData,
  updateContentItem,
  updateScheduleEntry
} from "./appStore";
import { externalScenarioToScenario, registerCouldaMadeRoutes } from "./couldamade";

const PRIMARY_PORT = Number(process.env.PORT ?? 5000);
const PORTS = [...new Set([PRIMARY_PORT, 5000, 3000])];

await loadJobs();
await loadAppData();

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use("/renders", express.static(path.resolve("renders")));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "couldamade-video-engine" });
});

app.get("/api/healthz", (_req, res) => {
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

app.post("/api/ideas", (req, res) => {
  const parsed = scenarioSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid scenario", details: parsed.error.flatten() });
    return;
  }

  res.json({ videos: buildVideoIdeas(parsed.data) });
});

registerCouldaMadeRoutes(app);

app.post("/api/ideas/from-external", (req, res) => {
  const scenario = externalScenarioToScenario(req.body);
  res.json({ videos: buildVideoIdeas(scenario), scenario });
});

app.post("/api/content/generate-finance", async (req, res) => {
  const parsed = scenarioSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid scenario", details: parsed.error.flatten() });
    return;
  }

  const items = [];
  for (const video of buildVideoIdeas(parsed.data)) {
    items.push(await createContentItem({
      hook: video.hook,
      body: video.voiceover,
      caption: video.caption,
      platform: video.platform,
      status: "draft",
      video
    }));
  }
  res.json(items);
});

app.post("/api/pipeline/generate-posts", async (req, res) => {
  const scenarios = Array.isArray(req.body?.scenarios) ? req.body.scenarios : [req.body];
  const created = [];
  for (const scenario of scenarios) {
    const parsed = scenarioSchema.safeParse(scenario);
    if (!parsed.success) continue;
    for (const video of buildVideoIdeas(parsed.data)) {
      created.push(await createContentItem({
        hook: video.hook,
        body: video.voiceover,
        caption: video.caption,
        platform: video.platform,
        status: "draft",
        video
      }));
    }
  }
  res.json({ posts: created, count: created.length });
});

app.post("/api/render/batch", async (req, res) => {
  const parsed = batchRenderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid batch", details: parsed.error.flatten() });
    return;
  }

  const jobs = [];
  for (const video of parsed.data.videos) {
    jobs.push(await enqueueRender(video));
  }
  res.status(202).json({ jobs });
});

app.get("/api/content/items", (_req, res) => {
  res.json(listContentItems());
});

app.post("/api/content/items", async (req, res) => {
  const parsed = createContentItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid content item", details: parsed.error.flatten() });
    return;
  }
  res.status(201).json(await createContentItem(parsed.data));
});

app.get("/api/content/items/:id", (req, res) => {
  const item = getContentItem(Number(req.params.id));
  if (!item) {
    res.status(404).json({ error: "Content item not found" });
    return;
  }
  res.json(item);
});

app.put("/api/content/items/:id", async (req, res) => {
  const parsed = updateContentItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid content update", details: parsed.error.flatten() });
    return;
  }
  const item = await updateContentItem(Number(req.params.id), parsed.data);
  if (!item) {
    res.status(404).json({ error: "Content item not found" });
    return;
  }
  res.json(item);
});

app.delete("/api/content/items/:id", async (req, res) => {
  const deleted = await deleteContentItem(Number(req.params.id));
  res.status(deleted ? 204 : 404).send(deleted ? undefined : { error: "Content item not found" });
});

app.get("/api/videos", (_req, res) => {
  res.json(listSavedVideos());
});

app.post("/api/videos", async (req, res) => {
  const parsed = createSavedVideoSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid saved video", details: parsed.error.flatten() });
    return;
  }
  res.status(201).json(await createSavedVideo(videoInputSchema.parse(parsed.data)));
});

app.delete("/api/videos/:id", async (req, res) => {
  const deleted = await deleteSavedVideo(Number(req.params.id));
  res.status(deleted ? 204 : 404).send(deleted ? undefined : { error: "Saved video not found" });
});

app.get("/api/schedule/entries", (req, res) => {
  const platform = typeof req.query.platform === "string" ? req.query.platform : undefined;
  if (platform && !["tiktok", "instagram", "youtube"].includes(platform)) {
    res.status(400).json({ error: "Invalid platform" });
    return;
  }
  res.json(listScheduleEntries(platform as "tiktok" | "instagram" | "youtube" | undefined));
});

app.post("/api/schedule/entries", async (req, res) => {
  const parsed = createScheduleEntrySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid schedule entry", details: parsed.error.flatten() });
    return;
  }
  const entry = await createScheduleEntry(parsed.data);
  if (!entry) {
    res.status(404).json({ error: "Content item not found" });
    return;
  }
  res.status(201).json(entry);
});

app.put("/api/schedule/entries/:id", async (req, res) => {
  const parsed = updateScheduleEntrySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid schedule update", details: parsed.error.flatten() });
    return;
  }
  const entry = await updateScheduleEntry(Number(req.params.id), parsed.data);
  if (!entry) {
    res.status(404).json({ error: "Schedule entry not found" });
    return;
  }
  res.json(entry);
});

app.delete("/api/schedule/entries/:id", async (req, res) => {
  const deleted = await deleteScheduleEntry(Number(req.params.id));
  res.status(deleted ? 204 : 404).send(deleted ? undefined : { error: "Schedule entry not found" });
});

app.post("/api/content/tts", async (req, res) => {
  const text = typeof req.body?.text === "string" ? req.body.text.slice(0, 4096) : "";
  if (!text.trim()) {
    res.status(400).json({ error: "Missing text" });
    return;
  }

  if (process.env.AI_INTEGRATIONS_OPENAI_BASE_URL && process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    const speech = await fetch(`${process.env.AI_INTEGRATIONS_OPENAI_BASE_URL.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.AI_INTEGRATIONS_OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-audio",
        modalities: ["text", "audio"],
        audio: { voice: process.env.REPLIT_AI_TTS_VOICE ?? "onyx", format: "mp3" },
        messages: [
          {
            role: "system",
            content:
              "You are a voiceover narrator. Read the script the user provides word for word, exactly as written. " +
              "Use a calm, confident, analytical tone with clear pronunciation and a measured short-form video pace. " +
              "Do not add any words, commentary, or filler not present in the script."
          },
          { role: "user", content: text }
        ]
      })
    });

    if (!speech.ok) {
      res.status(502).json({ error: "Voice generation failed", details: await speech.text() });
      return;
    }

    const data = await speech.json() as { choices?: Array<{ message?: { audio?: { data?: string } } }> };
    const audioBase64 = data.choices?.[0]?.message?.audio?.data;
    if (!audioBase64) {
      res.status(502).json({ error: "Voice generation returned no audio." });
      return;
    }

    const audio = Buffer.from(audioBase64, "base64");
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    res.send(audio);
    return;
  }

  const externalTtsBaseUrl =
    process.env.EXTERNAL_TTS_BASE_URL?.trim() ||
    "https://52ede6e5-94ef-483b-aaaf-f060ba7ecc34-00-i9ffldeixdtc.picard.replit.dev";
  const speech = await fetch(`${externalTtsBaseUrl.replace(/\/$/, "")}/api/content/tts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text })
  });

  if (!speech.ok) {
    res.status(502).json({ error: "External voice generation failed", details: await speech.text() });
    return;
  }

  const audio = Buffer.from(await speech.arrayBuffer());
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Cache-Control", "no-store");
  res.send(audio);
});

const dashboardDir = path.resolve("dist/dashboard");
app.use(express.static(dashboardDir));
app.get("*", (_req, res) => {
  res.sendFile(path.join(dashboardDir, "index.html"));
});

let listening = 0;
for (const port of PORTS) {
  const server = app.listen(port, "0.0.0.0", () => {
    listening += 1;
    console.log(`CouldaMade video engine API listening on http://0.0.0.0:${port}`);
  });
  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      console.log(`Port ${port} is already in use, skipping it.`);
      return;
    }
    throw error;
  });
}

setTimeout(() => {
  if (listening === 0) {
    console.error(`Could not listen on any expected Replit port: ${PORTS.join(", ")}`);
    process.exit(1);
  }
}, 1000);
