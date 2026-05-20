export function formatDollar(value: number): string {
  if (value >= 1_000_000_000) return `$${formatCompactNumber(value / 1_000_000_000)}B`;
  if (value >= 1_000_000) return `$${formatCompactNumber(value / 1_000_000)}M`;
  if (value >= 10_000) return `$${Math.round(value / 1_000).toLocaleString("en-US")}K`;
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function formatCompactNumber(value: number): string {
  const rounded = value >= 10 ? value.toFixed(0) : value.toFixed(1);
  return rounded.replace(/\.0$/, "");
}

export function formatDate(year: number, month: number, day: number): string {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toLocaleDateString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: day > 1 ? "short" : "long",
    ...(day > 1 ? { day: "numeric" } : {})
  });
}

export function safeSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || "video";
}
