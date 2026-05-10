import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RenderJob } from "../shared/types";
import { safeSlug } from "../shared/format";
import { writeCaptionFile } from "./captions";

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
): Promise<{ outputPath: string; outputUrl: string; captionUrl: string; metadataUrl: string }> {
  await mkdir(path.resolve("renders"), { recursive: true });

  const serveUrl = await getBundleUrl();
  const composition = await selectComposition({
    serveUrl,
    id: "CouldaMadeFinance",
    inputProps: job.input
  });

  const filename = `${job.id}-${safeSlug(job.input.ticker)}-${safeSlug(job.input.company)}.mp4`;
  const outputPath = path.resolve("renders", filename);
  const captionName = filename.replace(/\.mp4$/, ".srt");
  const metadataName = filename.replace(/\.mp4$/, ".json");
  const captionPath = path.resolve("renders", captionName);
  const metadataPath = path.resolve("renders", metadataName);

  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    imageFormat: "jpeg",
    inputProps: job.input,
    outputLocation: outputPath,
    onProgress: ({ progress }) => onProgress(progress)
  });

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
