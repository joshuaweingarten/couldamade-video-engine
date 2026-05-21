import { z } from "zod";

export const platformSchema = z.enum(["tiktok", "instagram", "youtube"]);
export const angleSchema = z.enum(["regret", "receipt", "shock", "lesson", "comeback"]);
export const visualStyleSchema = z.enum(["terminal", "receipt", "regret", "clean", "newsroom"]);
export const qualityPresetSchema = z.enum(["punchy", "clean-finance", "dramatic-regret"]);
export const templateSchema = z.enum(["couldamade-finance", "couldamade-pro"]);

export const scriptSceneSchema = z.object({
  text: z.string().min(1).max(180),
  startFrame: z.coerce.number().int().min(0),
  endFrame: z.coerce.number().int().min(1),
  emphasis: z.string().max(80).optional()
});

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
  hook: z.string().max(120).default("This is what would've happened"),
  angle: angleSchema.default("regret"),
  platform: platformSchema.default("tiktok"),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#28f296"),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#28f296"),
  logoUrl: z.string().max(500).optional(),
  visualStyle: visualStyleSchema.default("terminal"),
  qualityPreset: qualityPresetSchema.default("punchy"),
  disclaimer: z.string().max(220).default("Not financial advice. For education only."),
  voiceoverAudioUrl: z.string().max(500).optional(),
  scenes: z.array(scriptSceneSchema).min(1).max(8).optional(),
  template: templateSchema.default("couldamade-finance")
});

export type VideoInput = z.infer<typeof videoInputSchema>;
export type ScriptScene = z.infer<typeof scriptSceneSchema>;
export type SocialPlatform = z.infer<typeof platformSchema>;
export type CreativeAngle = z.infer<typeof angleSchema>;
export type VisualStyle = z.infer<typeof visualStyleSchema>;
export type QualityPreset = z.infer<typeof qualityPresetSchema>;
export type VideoTemplate = z.infer<typeof templateSchema>;

export const scenarioSchema = z.object({
  ticker: z.string().min(1).max(12),
  company: z.string().min(1).max(60),
  assetType: z.string().min(1).max(30).default("stock"),
  amount: z.coerce.number().positive().default(1000),
  value: z.coerce.number().positive(),
  year: z.coerce.number().int().min(1900).max(2100),
  month: z.coerce.number().int().min(1).max(12).default(1),
  day: z.coerce.number().int().min(1).max(31).default(1),
  logoUrl: z.string().max(500).optional(),
  platform: platformSchema.default("tiktok"),
  angles: z.array(angleSchema).min(1).max(5).default(["regret", "shock", "lesson"])
});

export type ScenarioInput = z.infer<typeof scenarioSchema>;

export const batchRenderSchema = z.object({
  videos: z.array(videoInputSchema).min(1).max(25)
});

export type BatchRenderInput = z.infer<typeof batchRenderSchema>;

export type RenderStatus = "queued" | "rendering" | "done" | "failed";

export interface RenderJob {
  id: string;
  status: RenderStatus;
  input: VideoInput;
  createdAt: string;
  updatedAt: string;
  outputUrl?: string;
  outputPath?: string;
  captionUrl?: string;
  metadataUrl?: string;
  error?: string;
  progress: number;
}

export interface CreateRenderResponse {
  job: RenderJob;
}

export type ContentStatus = "draft" | "approved" | "published";

export interface ContentItem {
  id: number;
  hook: string;
  body: string;
  caption: string;
  platform: SocialPlatform;
  status: ContentStatus;
  video: VideoInput;
  createdAt: string;
  updatedAt: string;
}

export interface SavedVideo {
  id: number;
  template: string;
  ticker: string;
  assetType: string;
  company: string;
  year: number;
  month: number;
  day: number;
  amount: number;
  value: number;
  voiceover: string;
  caption: string;
  createdAt: string;
}

export const createSavedVideoSchema = videoInputSchema.pick({
  template: true,
  ticker: true,
  assetType: true,
  company: true,
  year: true,
  month: true,
  day: true,
  amount: true,
  value: true,
  logoUrl: true,
  voiceover: true,
  caption: true
});

export const createContentItemSchema = z.object({
  hook: z.string().min(1).max(160),
  body: z.string().min(1).max(2000),
  caption: z.string().min(1).max(500),
  platform: platformSchema.default("tiktok"),
  status: z.enum(["draft", "approved", "published"]).default("draft"),
  video: videoInputSchema
});

export const updateContentItemSchema = createContentItemSchema.partial();
