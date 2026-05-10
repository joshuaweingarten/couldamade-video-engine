import { videoInputSchema } from "../shared/types";
import { renderJobToFile } from "./render";

const input = videoInputSchema.parse({
  ticker: process.env.TICKER ?? "TSLA",
  company: process.env.COMPANY ?? "Tesla",
  amount: Number(process.env.AMOUNT ?? 1000),
  value: Number(process.env.VALUE ?? 55000),
  year: Number(process.env.YEAR ?? 2019),
  month: Number(process.env.MONTH ?? 1),
  day: Number(process.env.DAY ?? 1),
  voiceover: process.env.VOICEOVER ?? ""
});

const now = new Date().toISOString();
const result = await renderJobToFile(
  {
    id: `manual-${Date.now()}`,
    status: "rendering",
    input,
    createdAt: now,
    updatedAt: now,
    progress: 0
  },
  (progress) => {
    process.stdout.write(`render ${Math.round(progress * 100)}%\r`);
  }
);

console.log(`\nRendered ${result.outputPath}`);
