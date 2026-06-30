import type { Express, Response } from "express";
import type { ChartPoint, ScenarioInput } from "../shared/types";

const DEFAULT_BASE = "https://couldamade.com";
const TIMEOUT_MS = 10_000;
const calculationCache = new Map<string, ExternalScenario>();

const LOCAL_ASSETS: CouldaMadeAsset[] = [
  { asset: "AAPL", assetType: "stock", name: "Apple" },
  { asset: "MSFT", assetType: "stock", name: "Microsoft" },
  { asset: "NVDA", assetType: "stock", name: "Nvidia" },
  { asset: "TSLA", assetType: "stock", name: "Tesla" },
  { asset: "AMZN", assetType: "stock", name: "Amazon" },
  { asset: "GOOGL", assetType: "stock", name: "Alphabet" },
  { asset: "META", assetType: "stock", name: "Meta Platforms" },
  { asset: "NFLX", assetType: "stock", name: "Netflix" },
  { asset: "AMD", assetType: "stock", name: "Advanced Micro Devices" },
  { asset: "AVGO", assetType: "stock", name: "Broadcom" },
  { asset: "PLTR", assetType: "stock", name: "Palantir" },
  { asset: "SHOP", assetType: "stock", name: "Shopify" },
  { asset: "COIN", assetType: "stock", name: "Coinbase" },
  { asset: "MSTR", assetType: "stock", name: "MicroStrategy" },
  { asset: "SPY", assetType: "stock", name: "SPDR S&P 500 ETF" },
  { asset: "QQQ", assetType: "stock", name: "Invesco QQQ Trust" },
  { asset: "BTC", assetType: "crypto", name: "Bitcoin" },
  { asset: "ETH", assetType: "crypto", name: "Ethereum" }
];

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
  logoUrl?: string;
  chartPoints?: ChartPoint[];
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

    const cacheKey = `${assetType}:${asset}:${amount}:${date}`.toLowerCase();
    const cached = calculationCache.get(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const proxied = await proxyGet("/api/calculate", { asset, assetType, amount, date });
    const scenario = scenarioFromProxy(proxied);
    if (scenario) {
      const enriched = await withChartPoints(scenario, asset, assetType, date);
      calculationCache.set(cacheKey, enriched);
      res.json(enriched);
      return;
    }

    const fallback = await calculateStockFallback(asset, assetType, amount, date);
    if (fallback) {
      calculationCache.set(cacheKey, fallback);
      res.json(fallback);
      return;
    }

    sendScenarioError(res, proxied, "CouldaMade/Yahoo is temporarily rate-limited. Try again in a few minutes, or enter the current value manually and generate ideas.");
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
    const remote = proxied.ok ? normaliseAssetArray(proxied.body) : [];
    res.json(mergeAssets(remote, searchLocalAssets(q)));
  });

  app.get("/api/external/trending", async (_req, res) => {
    const proxied = await proxyGet("/api/assets/trending", {});
    const remote = proxied.ok ? normaliseAssetArray(proxied.body) : [];
    res.json(mergeAssets(remote, LOCAL_ASSETS.slice(0, 8)));
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
    logoUrl: input.logoUrl,
    chartPoints: input.chartPoints,
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
  if (!proxied.ok) return sendScenarioError(res, proxied, error);
  const scenario = scenarioFromProxy(proxied);
  if (!scenario) {
    res.status(502).json({ error: "couldamade.com returned an unrecognised response shape", raw: proxied.body });
    return;
  }
  res.json(scenario);
}

function sendScenarioError(res: Response, proxied: { ok: boolean; status: number; body: unknown }, error: string): void {
  res.status(proxied.status || 502).json({ error, raw: proxied.body });
}

function scenarioFromProxy(proxied: { ok: boolean; body: unknown }): ExternalScenario | null {
  if (!proxied.ok) return null;
  const scenario = normaliseItem(unwrapSingle(proxied.body)) ?? normaliseArray(proxied.body)?.[0];
  return scenario ?? null;
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
    dataSource: str(item.source) ?? str(item.dataSource) ?? str(item.data_source) ?? "couldamade.com",
    logoUrl: str(item.logoUrl) ?? str(item.logo_url),
    chartPoints: normaliseChartPoints(item.chartPoints ?? item.chart_points ?? item.history ?? item.priceHistory ?? item.price_history ?? item.prices)
  };
}

function normaliseAssetArray(raw: unknown): CouldaMadeAsset[] {
  const arr = unwrapArray(raw);
  if (!arr) return [];
  return arr.map(normaliseAssetItem).filter(Boolean) as CouldaMadeAsset[];
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

function searchLocalAssets(query: string): CouldaMadeAsset[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return LOCAL_ASSETS.filter((asset) =>
    asset.asset.toLowerCase().includes(q) ||
    asset.name?.toLowerCase().includes(q)
  ).slice(0, 8);
}

function mergeAssets(primary: CouldaMadeAsset[], fallback: CouldaMadeAsset[]): CouldaMadeAsset[] {
  const seen = new Set<string>();
  const merged = [];
  for (const asset of [...primary, ...fallback]) {
    const key = `${asset.assetType}:${asset.asset}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(asset);
  }
  return merged.slice(0, 8);
}

async function calculateStockFallback(asset: string, assetType: string, amount: string, date: string): Promise<ExternalScenario | null> {
  if (assetType.toLowerCase() !== "stock") return null;
  const invested = Number.parseFloat(amount);
  if (!Number.isFinite(invested) || invested <= 0) return null;

  const prices = await fetchStockChartPoints(asset, assetType, date);
  if (!prices || prices.length < 2) return null;
  const first = prices[0];
  const last = prices[prices.length - 1];
  if (first.close <= 0 || last.close <= 0) return null;
  const finalValue = Math.round((invested / first.close) * last.close);
  return {
    asset: localAssetName(asset) ?? asset.toUpperCase(),
    ticker: asset.toUpperCase(),
    category: "stock",
    startDate: first.date,
    endDate: last.date,
    amountInvested: Math.round(invested),
    finalValue,
    returnMultiple: finalValue / invested,
    dataSource: "stooq.com fallback",
    chartPoints: prices
  };
}

async function withChartPoints(scenario: ExternalScenario, asset: string, assetType: string, date: string): Promise<ExternalScenario> {
  if (scenario.chartPoints && scenario.chartPoints.length >= 2) return scenario;
  const points = await fetchStockChartPoints(asset, assetType, scenario.startDate ?? date);
  return points && points.length >= 2 ? { ...scenario, chartPoints: points } : scenario;
}

async function fetchStockChartPoints(asset: string, assetType: string, date: string): Promise<ChartPoint[] | null> {
  if (assetType.toLowerCase() !== "stock") return null;
  const start = new Date(date);
  if (Number.isNaN(start.getTime())) return null;

  const symbol = toStooqSymbol(asset);
  const startParam = compactDate(start);
  const endParam = compactDate(new Date());
  const url = `https://stooq.com/q/d/l/?s=${encodeURIComponent(symbol)}&d1=${startParam}&d2=${endParam}&i=d`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "text/csv",
        "User-Agent": "CouldaMade-VideoFactory/1.0"
      },
      signal: AbortSignal.timeout(TIMEOUT_MS)
    });
    if (!response.ok) return null;
    const prices = parseStooqCsv(await response.text());
    return prices.length >= 2 ? downsampleChartPoints(prices) : null;
  } catch {
    return null;
  }
}

function parseStooqCsv(csv: string): ChartPoint[] {
  return csv
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => {
      const [date, , , , close] = line.split(",");
      return { date, close: Number.parseFloat(close) };
    })
    .filter((row) => row.date && Number.isFinite(row.close));
}

function normaliseChartPoints(raw: unknown): ChartPoint[] | undefined {
  const arr = unwrapChartArray(raw);
  if (!arr) return undefined;
  const points = arr
    .map((rawPoint) => {
      if (!rawPoint || typeof rawPoint !== "object") return null;
      const point = rawPoint as Record<string, unknown>;
      const date = str(point.date) ?? str(point.time) ?? str(point.timestamp);
      const close = num(point.close) ?? num(point.adjClose) ?? num(point.adjustedClose) ?? num(point.price) ?? num(point.value);
      return date && close && close > 0 ? { date, close } : null;
    })
    .filter(Boolean) as ChartPoint[];
  return points.length >= 2 ? downsampleChartPoints(points) : undefined;
}

function unwrapChartArray(raw: unknown): unknown[] | null {
  if (Array.isArray(raw)) return raw;
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const key = ["chartPoints", "chart_points", "history", "priceHistory", "price_history", "prices", "data"].find((item) => Array.isArray(obj[item]));
  return key ? (obj[key] as unknown[]) : null;
}

function downsampleChartPoints(points: ChartPoint[], maxPoints = 220): ChartPoint[] {
  if (points.length <= maxPoints) return points;
  const step = (points.length - 1) / (maxPoints - 1);
  return Array.from({ length: maxPoints }, (_, index) => points[Math.round(index * step)]);
}

function toStooqSymbol(asset: string): string {
  const cleaned = asset.trim().toLowerCase().replace(/[^a-z0-9.-]/g, "");
  return cleaned.includes(".") ? cleaned : `${cleaned}.us`;
}

function compactDate(date: Date): string {
  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;
}

function localAssetName(asset: string): string | undefined {
  return LOCAL_ASSETS.find((item) => item.asset.toLowerCase() === asset.toLowerCase())?.name;
}

function unwrapSingle(body: unknown): unknown {
  if (!body || typeof body !== "object") return body;
  const obj = body as Record<string, unknown>;
  if (obj.result && typeof obj.result === "object" && !Array.isArray(obj.result)) return obj.result;
  return body;
}

function unwrapArray(body: unknown): unknown[] | null {
  if (Array.isArray(body)) return body;
  if (!body || typeof body !== "object") return null;
  const obj = body as Record<string, unknown>;
  const key = ["results", "assets", "data", "items", "result"].find((item) => Array.isArray(obj[item]));
  return key ? (obj[key] as unknown[]) : null;
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
