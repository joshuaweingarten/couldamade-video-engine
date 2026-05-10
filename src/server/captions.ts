import { writeFile } from "node:fs/promises";
import type { RenderJob, ScriptScene } from "../shared/types";

const FPS = 30;

export async function writeCaptionFile(job: RenderJob, outputPath: string): Promise<void> {
  const scenes = job.input.scenes ?? defaultScenes(job);
  const srt = scenes
    .map((scene, index) => {
      return [
        String(index + 1),
        `${frameToTimestamp(scene.startFrame)} --> ${frameToTimestamp(scene.endFrame)}`,
        scene.text
      ].join("\n");
    })
    .join("\n\n");

  await writeFile(outputPath, `${srt}\n`, "utf8");
}

function defaultScenes(job: RenderJob): ScriptScene[] {
  const lines = job.input.voiceover
    ? job.input.voiceover.split(/(?<=[.!?])\s+/).filter(Boolean)
    : [job.input.hook, job.input.caption].filter(Boolean);

  const framesPerScene = Math.max(60, Math.floor(660 / Math.max(lines.length, 1)));
  return lines.map((text, index) => ({
    text,
    startFrame: index * framesPerScene,
    endFrame: Math.min(660, (index + 1) * framesPerScene)
  }));
}

function frameToTimestamp(frame: number): string {
  const totalMs = Math.round((frame / FPS) * 1000);
  const ms = totalMs % 1000;
  const totalSeconds = Math.floor(totalMs / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)},${String(ms).padStart(3, "0")}`;
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
