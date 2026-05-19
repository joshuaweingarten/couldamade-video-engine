import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RenderJob } from "../shared/types";
import { safeSlug } from "../shared/format";
import { writeCaptionFile } from "./captions";

let bundledServeUrl: string | null = null;
let resolvedBrowserExecutable: string | null | undefined;

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

  const serveUrl = await withRenderStage("bundle Remotion video", () => getBundleUrl());
  const browserExecutable = getBrowserExecutable();
  const composition = await withRenderStage("load Remotion composition", () =>
    selectComposition({
      serveUrl,
      id: "CouldaMadeFinance",
      inputProps: job.input,
      browserExecutable,
      chromiumOptions,
      timeoutInMilliseconds: 120_000
    })
  );

  const filename = `${job.id}-${safeSlug(job.input.ticker)}-${safeSlug(job.input.company)}.mp4`;
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
      inputProps: job.input,
      outputLocation: outputPath,
      browserExecutable,
      chromiumOptions,
      concurrency: 1,
      timeoutInMilliseconds: 120_000,
      onProgress: ({ progress }) => onProgress(progress)
    })
  );

  await writeCaptionFile(job, captionPath);
  await writeFile(
    metadataPath,
    JSON.stringify(
      {
        id: job.id,
        input: job.input,
        output: filename,
        captionFile: captionName,
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

async function withRenderStage<T>(stage: string, task: () => Promise<T>): Promise<T> {
  try {
    return await task();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`${stage} failed: ${message}`);
  }
}
