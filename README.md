# CouldaMade Video Factory

A Replit-friendly app for generating short-form finance videos from investment
scenarios. It replaces fragile browser screen recording with a deterministic
Remotion and ffmpeg render pipeline.

## What It Does

- Turns one scenario into multiple video ideas, hooks, scripts, and captions.
- Queues one video or a batch of videos.
- Renders 9:16 H.264 MP4 files with consistent fonts and layout.
- Adds local narration audio during render inside Replit.
- Writes `.srt` captions and `.json` metadata next to every finished video.
- Keeps a local render history that survives app restarts on Replit.
- Exposes API endpoints so another CouldaMade app can create videos later.

## Quick Start

```bash
npm install
npm run dev
```

Open the Replit webview. Enter a scenario, generate ideas, then queue one or all
of the generated videos.

## Replit Setup

1. Import this repo into Replit from GitHub.
2. Let Replit install dependencies.
3. Make sure `ffmpeg` is available. This repo includes `replit.nix` with `ffmpeg`.
4. Press Run.

If Replit does not auto-install dependencies, open the Shell and run:

```bash
npm install
npm run dev
```

For deployment, use:

```bash
npm run build
npm start
```

## Narration

Narration first uses Replit's AI voice integration when the workspace provides
`AI_INTEGRATIONS_OPENAI_BASE_URL` and `AI_INTEGRATIONS_OPENAI_API_KEY`. This is
the natural voice path used by the original app.

If that integration is not available, the app calls the original viral content
scheduler's `/api/content/tts` endpoint through `EXTERNAL_TTS_BASE_URL`, which
keeps the same natural voice without manually adding an API key to this Repl.
If that endpoint is unavailable, the app falls back to local `espeak-ng`
narration so renders still complete. The local fallback can be tuned with
`LOCAL_TTS_VOICE`, `LOCAL_TTS_SPEED`, and `LOCAL_TTS_PITCH`, but it will not
sound as human as the Replit AI voice.

## Dashboard Workflow

1. Fill in ticker, company, investment amount, current value, and starting date.
2. Pick creative angles such as regret, shock, lesson, receipt, or comeback.
3. Click `Generate video ideas`.
4. Queue a single idea or click `Queue all`.
5. Download MP4, SRT captions, and JSON metadata from the library.

## API

Generate video ideas:

```http
POST /api/ideas
Content-Type: application/json

{
  "ticker": "TSLA",
  "company": "Tesla",
  "assetType": "stock",
  "amount": 1000,
  "value": 55000,
  "year": 2019,
  "month": 1,
  "day": 1,
  "platform": "tiktok",
  "angles": ["regret", "shock", "lesson"]
}
```

Create one render job:

```http
POST /api/render
Content-Type: application/json

{
  "ticker": "TSLA",
  "company": "Tesla",
  "assetType": "stock",
  "amount": 1000,
  "value": 55000,
  "year": 2019,
  "month": 1,
  "day": 1,
  "hook": "This is what would've happened",
  "angle": "regret",
  "voiceover": "Script text",
  "caption": "Social caption"
}
```

Create many render jobs:

```http
POST /api/render/batch
Content-Type: application/json

{
  "videos": []
}
```

List jobs:

```http
GET /api/jobs
```

Fetch one job:

```http
GET /api/jobs/:id
```

## Output Files

Finished renders are served from `/renders`:

- `.mp4` final video
- `.srt` captions
- `.json` render metadata

On Replit, completed files are stored in the local `renders/` folder and job
history is stored in `data/jobs.json`.

## Optional Integrations To Add Later

This version is intentionally useful without paid services. The next upgrades
can be added behind environment variables:

- A market-data provider to calculate current values automatically.
- A voice provider to generate narration audio.
- Durable storage such as Cloudflare R2 or S3 if Replit file persistence becomes
  limiting.
- A scheduler that queues 25 videos per week.

## Why This Architecture

The old browser capture approach depended on DOM-to-canvas recording. That is
fragile for fonts, animation timing, audio sync, and MP4 compatibility.

This repo renders known frames with Remotion and encodes them with ffmpeg, which
is the right foundation for making 100+ videos per month.
