import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { execFile, execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { RenderJob, VideoInput } from "../shared/types";
import { safeSlug } from "../shared/format";
import { writeCaptionFile } from "./captions";

let bundledServeUrl: string | null = null;
let resolvedBrowserExecutable: string | null | undefined;
const execFileAsync = promisify(execFile);

const chromiumOptions = {
  gl: "swangle",
  enableMultiProcessOnLinux: false
} as const;
const REPLIT_AI_TTS_MODEL = process.env.REPLIT_AI_TTS_MODEL ?? "gpt-audio-mini";
const NARRATION_STYLE_PROMPT =
  "You are a sharp short-form finance narrator. Read the script the user provides word for word, exactly as written. " +
  "Use a subtle British or international accent if the voice model supports it. Keep the delivery dry, confident, slightly edgy, and skeptical, " +
  "like you are pointing out an uncomfortable money truth. Use crisp pacing and clear pronunciation. No hype, no radio-announcer energy, " +
  "and no friendly customer-service tone. Do not add any words, commentary, or filler not present in the script.";

async function getBundleUrl(): Promise<string> {
  if (bundledServeUrl) return bundledServeUrl;
  bundledServeUrl = await bundle({
    entryPoint: path.resolve("src/video/index.ts"),
    publicDir: path.resolve("public")
  });
  return bundledServeUrl;
}

function getBrowserExecutable(): string | undefined {
  if (resolvedBrowserExecutable !== undefined) return resolvedBrowserExecutable ?? undefined;

  const configured =
    process.env.REMOTION_BROWSER_EXECUTABLE ??
    process.env.BROWSER_EXECUTABLE ??
    process.env.PUPPETEER_EXECUTABLE_PATH ??
    process.env.CHROME_BIN ??
    process.env.CHROMIUM_PATH;

  if (configured) {
    resolvedBrowserExecutable = configured;
    return configured;
  }

  for (const candidate of ["chromium", "chromium-browser", "google-chrome", "google-chrome-stable", "chrome"]) {
    try {
      const found = execFileSync("which", [candidate], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
      if (found) {
        resolvedBrowserExecutable = found;
        return found;
      }
    } catch {
      // Keep trying the other common executable names.
    }
  }

  resolvedBrowserExecutable = null;
  return undefined;
}

export async function renderJobToFile(
  job: RenderJob,
  onProgress: (progress: number) => void
): Promise<{ outputPath: string; outputUrl: string; captionUrl: string; metadataUrl: string }> {
  await mkdir(path.resolve("renders"), { recursive: true });

  const input = await withRenderStage("generate narration audio", () => attachNarrationAudio(job.input, job.id));
  const serveUrl = await withRenderStage("bundle Remotion video", () => getBundleUrl());
  const browserExecutable = getBrowserExecutable();
  const composition = await withRenderStage("load Remotion composition", () =>
    selectComposition({
      serveUrl,
      id: "CouldaMadeFinance",
      inputProps: input,
      browserExecutable,
      chromiumOptions,
      timeoutInMilliseconds: 120_000
    })
  );

  const filename = `${job.id}-${safeSlug(input.ticker)}-${safeSlug(input.company)}.mp4`;
  const outputPath = path.resolve("renders", filename);
  const captionName = filename.replace(/\.mp4$/, ".srt");
  const metadataName = filename.replace(/\.mp4$/, ".json");
  const captionPath = path.resolve("renders", captionName);
  const metadataPath = path.resolve("renders", metadataName);

  await withRenderStage("render MP4", () =>
    renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      imageFormat: "jpeg",
      inputProps: input,
      outputLocation: outputPath,
      browserExecutable,
      chromiumOptions,
      concurrency: 1,
      timeoutInMilliseconds: 120_000,
      onProgress: ({ progress }) => onProgress(progress)
    })
  );

  const renderedJob = { ...job, input };
  await writeCaptionFile(renderedJob, captionPath);
  await writeFile(
    metadataPath,
    JSON.stringify(
      {
        id: job.id,
        input,
        output: filename,
        captionFile: captionName,
        audioFile: input.voiceoverAudioUrl,
        renderedAt: new Date().toISOString()
      },
      null,
      2
    ),
    "utf8"
  );

  return {
    outputPath,
    outputUrl: `/renders/${filename}`,
    captionUrl: `/renders/${captionName}`,
    metadataUrl: `/renders/${metadataName}`
  };
}

async function attachNarrationAudio(input: VideoInput, jobId: string): Promise<VideoInput> {
  if (input.voiceoverAudioUrl || !input.voiceover.trim()) {
    return input;
  }

  const useReplitAi = Boolean(process.env.AI_INTEGRATIONS_OPENAI_BASE_URL && process.env.AI_INTEGRATIONS_OPENAI_API_KEY);
  const externalTtsBaseUrl = getExternalTtsBaseUrl();
  const useExternalTts = !useReplitAi && Boolean(externalTtsBaseUrl);
  const useLocalTts = !useReplitAi && !useExternalTts && process.env.ENABLE_LOCAL_TTS === "true";
  if (!useReplitAi && !useExternalTts && !useLocalTts) {
    console.warn(`Narration audio is not configured for render ${jobId}; continuing without audio.`);
    return input;
  }

  const audioName = `${jobId}-voiceover.${useReplitAi || useExternalTts ? "mp3" : "wav"}`;
  const audioPath = path.resolve("renders", audioName);
  try {
    if (useReplitAi) {
      await generateReplitAiNarration(input.voiceover, audioPath);
    } else if (externalTtsBaseUrl) {
      await generateExternalNarration(input.voiceover, audioPath, externalTtsBaseUrl);
    } else if (useLocalTts) {
      await generateLocalNarration(input.voiceover, audioPath);
    }
  } catch (error) {
    console.warn(`Narration audio unavailable for render ${jobId}; continuing without audio.`, error);
    return input;
  }
  const port = Number(process.env.PORT ?? 5000);
  return {
    ...input,
    voiceoverAudioUrl: `http://127.0.0.1:${port}/renders/${audioName}`
  };
}

function getExternalTtsBaseUrl(): string | undefined {
  const configured = process.env.EXTERNAL_TTS_BASE_URL?.trim();
  if (configured) return configured;

  return undefined;
}

async function generateExternalNarration(text: string, outputPath: string, baseUrl: string): Promise<void> {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/content/tts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ text: text.slice(0, 4096) })
  });

  if (!response.ok) {
    throw new Error(`External TTS failed: ${summarizeTtsError(await response.text())}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("audio")) {
    throw new Error(`External TTS returned ${contentType || "non-audio content"}.`);
  }

  const audio = Buffer.from(await response.arrayBuffer());
  if (audio.length === 0) {
    throw new Error("External TTS returned an empty audio file.");
  }
  await writeFile(outputPath, audio);
}

function summarizeTtsError(body: string): string {
  const plain = body
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return plain.slice(0, 300) || "No error body returned.";
}

async function generateReplitAiNarration(text: string, outputPath: string): Promise<void> {
  const baseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!baseUrl || !apiKey) {
    throw new Error("Replit AI voice integration is not configured.");
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: REPLIT_AI_TTS_MODEL,
      modalities: ["text", "audio"],
      audio: {
        voice: process.env.REPLIT_AI_TTS_VOICE ?? "onyx",
        format: "mp3"
      },
      messages: [
        {
          role: "system",
          content: NARRATION_STYLE_PROMPT
        },
        { role: "user", content: text.slice(0, 4096) }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Replit AI TTS failed: ${await response.text()}`);
  }

  const data = await response.json() as { choices?: Array<{ message?: { audio?: { data?: string } } }> };
  const audioBase64 = data.choices?.[0]?.message?.audio?.data;
  if (!audioBase64) {
    throw new Error("Replit AI TTS returned no audio data.");
  }
  await writeFile(outputPath, Buffer.from(audioBase64, "base64"));
}

async function generateLocalNarration(text: string, outputPath: string): Promise<void> {
  const voice = process.env.LOCAL_TTS_VOICE ?? "en-us";
  const speed = process.env.LOCAL_TTS_SPEED ?? "172";
  const pitch = process.env.LOCAL_TTS_PITCH ?? "48";
  await execFileAsync("espeak-ng", [
    "-v",
    voice,
    "-s",
    speed,
    "-p",
    pitch,
    "-w",
    outputPath,
    text.slice(0, 4096)
  ]);
}

async function withRenderStage<T>(stage: string, task: () => Promise<T>): Promise<T> {
  try {
    return await task();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${stage} failed: ${message}`);
  }
}
