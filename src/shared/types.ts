import { z } from "zod";

export const videoInputSchema = z.object({
  ticker: z.string().min(1).max(12).default("TSLA"),
  company: z.string().min(1).max(60).default("Tesla"),
  assetType: z.string().min(1).max(30).default("stock"),
  amount: z.coerce.number().positive().default(1000),
  value: z.coerce.number().positive().default(55000),
  year: z.coerce.number().int().min(1900).max(2100).default(2019),
  month: z.coerce.number().int().min(1).max(12).default(1),
  day: z.coerce.number().int().min(1).max(31).default(1),
  voiceover: z.string().max(4000).default(""),
  caption: z.string().max(500).default(""),
  template: z.literal("couldamade-finance").default("couldamade-finance")
});

export type VideoInput = z.infer<typeof videoInputSchema>;

export type RenderStatus = "queued" | "rendering" | "done" | "failed";

export interface RenderJob {
  id: string;
  status: RenderStatus;
  input: VideoInput;
  createdAt: string;
  updatedAt: string;
  outputUrl?: string;
  outputPath?: string;
  error?: string;
  progress: number;
}

export interface CreateRenderResponse {
  job: RenderJob;
}
