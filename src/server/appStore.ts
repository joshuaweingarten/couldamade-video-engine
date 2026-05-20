import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  ContentItem,
  SavedVideo,
  VideoInput
} from "../shared/types";

const DATA_DIR = path.resolve("data");
const APP_FILE = path.join(DATA_DIR, "app.json");

type AppData = {
  nextContentId: number;
  nextSavedVideoId: number;
  contentItems: ContentItem[];
  savedVideos: SavedVideo[];
};

let data: AppData = emptyData();

export async function loadAppData(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  try {
    data = { ...emptyData(), ...JSON.parse(await readFile(APP_FILE, "utf8")) };
  } catch {
    data = emptyData();
  }
}

async function saveAppData(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(APP_FILE, JSON.stringify(data, null, 2), "utf8");
}

export function listContentItems(): ContentItem[] {
  return [...data.contentItems].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getContentItem(id: number): ContentItem | undefined {
  return data.contentItems.find((item) => item.id === id);
}

export async function createContentItem(input: Omit<ContentItem, "id" | "createdAt" | "updatedAt">): Promise<ContentItem> {
  const now = new Date().toISOString();
  const item: ContentItem = {
    ...input,
    id: data.nextContentId++,
    createdAt: now,
    updatedAt: now
  };
  data.contentItems.push(item);
  await saveAppData();
  return item;
}

export async function updateContentItem(id: number, patch: Partial<Omit<ContentItem, "id" | "createdAt">>): Promise<ContentItem | undefined> {
  const item = getContentItem(id);
  if (!item) return undefined;
  Object.assign(item, patch, { updatedAt: new Date().toISOString() });
  await saveAppData();
  return item;
}

export async function deleteContentItem(id: number): Promise<boolean> {
  const before = data.contentItems.length;
  data.contentItems = data.contentItems.filter((item) => item.id !== id);
  await saveAppData();
  return data.contentItems.length !== before;
}

export function listSavedVideos(): SavedVideo[] {
  return [...data.savedVideos].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createSavedVideo(input: VideoInput): Promise<SavedVideo> {
  const video: SavedVideo = {
    id: data.nextSavedVideoId++,
    template: input.template,
    ticker: input.ticker,
    assetType: input.assetType,
    company: input.company,
    year: input.year,
    month: input.month,
    day: input.day,
    amount: input.amount,
    value: input.value,
    voiceover: input.voiceover,
    caption: input.caption,
    createdAt: new Date().toISOString()
  };
  data.savedVideos.push(video);
  await saveAppData();
  return video;
}

export async function deleteSavedVideo(id: number): Promise<boolean> {
  const before = data.savedVideos.length;
  data.savedVideos = data.savedVideos.filter((video) => video.id !== id);
  await saveAppData();
  return data.savedVideos.length !== before;
}

function emptyData(): AppData {
  return {
    nextContentId: 1,
    nextSavedVideoId: 1,
    contentItems: [],
    savedVideos: []
  };
}
