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

  const audioName = `${jobId}-voiceover.wav`;
  const audioPath = path.resolve("renders", audioName);
  await generateLocalNarration(input.voiceover, audioPath);
  const port = Number(process.env.PORT ?? 5000);
  return {
    ...input,
    voiceoverAudioUrl: `http://127.0.0.1:${port}/renders/${audioName}`
  };
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
