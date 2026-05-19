import type { Express, Response } from "express";
import type { ScenarioInput } from "../shared/types";

const DEFAULT_BASE = "https://couldamade.com";
const TIMEOUT_MS = 10_000;

export interface ExternalScenario {
  id?: string;
  asset: string;
  ticker?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  amountInvested: number;
  finalValue: number;
  returnMultiple?: number;
  dataSource?: string;
}

export interface CouldaMadeAsset {
  asset: string;
  assetType: string;
  name?: string;
  logoUrl?: string;
}

export function registerCouldaMadeRoutes(app: Express): void {
  app.get("/api/external/scenarios", async (req, res) => {
    const offset = String(req.query.offset ?? "0");
    const limit = String(req.query.limit ?? "20");
    const candidates = [
      { path: "/api/scenarios", params: { offset, limit } },
      { path: "/api/results", params: { limit } }
    ];

    for (const candidate of candidates) {
      const proxied = await proxyGet(candidate.path, candidate.params);
      if (!proxied.ok || !proxied.body) continue;
      const scenarios = normaliseArray(proxied.body);
      if (!scenarios) continue;
      const compelling = scenarios.filter((item) => (item.returnMultiple ?? 1) >= 2).sort(() => Math.random() - 0.5);
      res.json(compelling.length > 0 ? compelling : scenarios);
      return;
    }

    res.status(502).json({ error: "Could not fetch scenarios from couldamade.com" });
  });

  app.get("/api/external/calculate", async (req, res) => {
    const { asset, assetType, amount, date } = req.query as Record<string, string>;
    if (!asset || !assetType || !amount || !date) {
      res.status(400).json({ error: "Required: asset, assetType, amount, date" });
      return;
    }

    const proxied = await proxyGet("/api/calculate", { asset, assetType, amount, date });
    sendScenarioResponse(res, proxied, "couldamade.com /api/calculate failed");
  });

  app.get("/api/external/random", async (_req, res) => {
    const proxied = await proxyGet("/api/random-result", {});
    sendScenarioResponse(res, proxied, "couldamade.com /api/random-result failed");
  });

  app.get("/api/external/search", async (req, res) => {
    const q = String(req.query.q ?? "");
    if (!q.trim()) {
      res.status(400).json({ error: "q query param is required" });
      return;
    }
    const proxied = await proxyGet("/api/assets/search", { q });
    if (!proxied.ok) {
      res.status(proxied.status).json({ error: "couldamade.com /api/assets/search failed" });
      return;
    }
    res.json(normaliseAssetArray(proxied.body));
  });

  app.get("/api/external/trending", async (_req, res) => {
    const proxied = await proxyGet("/api/assets/trending", {});
    if (!proxied.ok) {
      res.status(proxied.status).json({ error: "couldamade.com /api/assets/trending failed" });
      return;
    }
    res.json(normaliseAssetArray(proxied.body));
  });

  app.get("/api/external/start-date", async (req, res) => {
    const { asset, assetType } = req.query as Record<string, string>;
    if (!asset || !assetType) {
      res.status(400).json({ error: "Required: asset, assetType" });
      return;
    }
    const proxied = await proxyGet("/api/assets/start-date", { asset, assetType });
    res.status(proxied.status).json(proxied.body ?? { error: "couldamade.com /api/assets/start-date failed" });
  });

  app.get("/api/external/price-history", async (req, res) => {
    const { ticker, assetType = "stock", fromDate } = req.query as Record<string, string>;
    if (!ticker || !fromDate) {
      res.status(400).json({ error: "Required: ticker, fromDate" });
      return;
    }
    const proxied = await proxyGet("/api/assets/history", { asset: ticker, assetType, date: fromDate });
    res.status(proxied.status).json(proxied.body ?? { error: "couldamade.com /api/assets/history failed" });
  });
}

export function externalScenarioToScenario(input: ExternalScenario): ScenarioInput {
  const date = input.startDate ? new Date(input.startDate) : new Date(Date.UTC(2019, 0, 1));
  const safeDate = Number.isNaN(date.getTime()) ? new Date(Date.UTC(2019, 0, 1)) : date;
  const assetType = input.category ?? "stock";
  const ticker = input.ticker ?? input.asset;
  return {
    ticker: assetType === "stock" ? ticker.toUpperCase() : ticker,
    company: input.asset,
    assetType,
    amount: input.amountInvested,
    value: input.finalValue,
    year: safeDate.getUTCFullYear(),
    month: safeDate.getUTCMonth() + 1,
    day: safeDate.getUTCDate(),
    platform: "tiktok",
    angles: ["regret", "shock", "lesson"]
  };
}

async function proxyGet(path: string, params: Record<string, string>): Promise<{ ok: boolean; status: number; body: unknown }> {
  const base = process.env.COULDAMADE_API_BASE ?? DEFAULT_BASE;
  const url = new URL(`${base}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") url.searchParams.set(key, value);
  }

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "CouldaMade-VideoFactory/1.0"
      },
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) {
      return { ok: false, status: response.status, body: null };
    }
    return { ok: response.ok, status: response.status, body: await response.json() };
  } catch {
    return { ok: false, status: 502, body: null };
  }
}

function sendScenarioResponse(res: Response, proxied: { ok: boolean; status: number; body: unknown }, error: string): void {
  if (!proxied.ok) {
    res.status(proxied.status).json({ error, raw: proxied.body });
    return;
  }
  const scenario = normaliseItem(unwrapSingle(proxied.body)) ?? normaliseArray(proxied.body)?.[0];
  if (!scenario) {
    res.status(502).json({ error: "couldamade.com returned an unrecognised response shape", raw: proxied.body });
    return;
  }
  res.json(scenario);
}

function normaliseArray(raw: unknown): ExternalScenario[] | null {
  let arr: unknown[];
  if (Array.isArray(raw)) {
    arr = raw;
  } else if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    const key = ["results", "scenarios", "data", "items", "result"].find((item) => Array.isArray(obj[item]));
    if (!key) return null;
    arr = obj[key] as unknown[];
  } else {
    return null;
  }

  const out = arr.map(normaliseItem).filter(Boolean) as ExternalScenario[];
  return out.length > 0 ? out : null;
}

function normaliseItem(raw: unknown): ExternalScenario | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const asset = str(item.asset_name) ?? str(item.assetName) ?? str(item.name) ?? str(item.asset) ?? str(item.ticker) ?? str(item.symbol);
  if (!asset) return null;

  let amountInvested = num(item.amount_invested) ?? num(item.amountInvested) ?? num(item.amount) ?? num(item.invested) ?? num(item.principal);
  const finalValue = num(item.current_value) ?? num(item.currentValue) ?? num(item.finalValue) ?? num(item.end_value) ?? num(item.endValue) ?? num(item.value);

  if (amountInvested == null && finalValue != null) {
    const multiple = num(item.multiple) ?? num(item.returnMultiple) ?? num(item.multiplier);
    amountInvested = multiple && multiple > 0 ? Math.round(finalValue / multiple) : 1000;
  }
  if (amountInvested == null || finalValue == null || amountInvested <= 0 || finalValue <= 0) return null;

  return {
    id: str(item.id),
    asset,
    ticker: str(item.symbol) ?? str(item.ticker) ?? str(item.asset),
    category: str(item.asset_type) ?? str(item.assetType) ?? str(item.type) ?? str(item.category),
    startDate: str(item.date_invested) ?? str(item.startDate) ?? str(item.start_date) ?? str(item.date),
    endDate: str(item.date_calculated) ?? str(item.endDate) ?? str(item.end_date) ?? str(item.toDate),
    amountInvested,
    finalValue,
    returnMultiple: num(item.multiple) ?? num(item.returnMultiple) ?? num(item.multiplier) ?? finalValue / amountInvested,
    dataSource: str(item.source) ?? str(item.dataSource) ?? str(item.data_source) ?? "couldamade.com"
  };
}

function normaliseAssetArray(raw: unknown): CouldaMadeAsset[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normaliseAssetItem).filter(Boolean) as CouldaMadeAsset[];
}

function normaliseAssetItem(raw: unknown): CouldaMadeAsset | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;
  const asset = str(item.symbol) ?? str(item.asset) ?? str(item.ticker);
  const assetType = str(item.type) ?? str(item.assetType) ?? str(item.category) ?? str(item.asset_type);
  if (!asset || !assetType) return null;
  return {
    asset,
    assetType,
    name: str(item.name) ?? str(item.asset_name),
    logoUrl: str(item.logoUrl) ?? str(item.logo_url)
  };
}

function unwrapSingle(body: unknown): unknown {
  if (!body || typeof body !== "object") return body;
  const obj = body as Record<string, unknown>;
  if (obj.result && typeof obj.result === "object" && !Array.isArray(obj.result)) return obj.result;
  return body;
}

function num(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
