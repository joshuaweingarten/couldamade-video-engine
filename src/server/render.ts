import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import type { RenderJob } from "../shared/types";
import { safeSlug } from "../shared/format";

let bundledServeUrl: string | null = null;

async function getBundleUrl(): Promise<string> {
  if (bundledServeUrl) return bundledServeUrl;
  bundledServeUrl = await bundle({
    entryPoint: path.resolve("src/video/index.ts"),
    publicDir: path.resolve("public")
  });
  return bundledServeUrl;
}

export async function renderJobToFile(
  job: RenderJob,
  onProgress: (progress: number) => void
): Promise<{ outputPath: string; outputUrl: string }> {
  await mkdir(path.resolve("renders"), { recursive: true });

  const serveUrl = await getBundleUrl();
  const composition = await selectComposition({
    serveUrl,
    id: "CouldaMadeFinance",
    inputProps: job.input
  });

  const filename = `${job.id}-${safeSlug(job.input.ticker)}-${safeSlug(job.input.company)}.mp4`;
  const outputPath = path.resolve("renders", filename);

  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    imageFormat: "jpeg",
    inputProps: job.input,
    outputLocation: outputPath,
    onProgress: ({ progress }) => onProgress(progress)
  });

  return {
    outputPath,
    outputUrl: `/renders/${filename}`
  };
}
