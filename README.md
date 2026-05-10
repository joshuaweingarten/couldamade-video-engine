# CouldaMade Video Engine

A Replit-friendly video rendering app for generating short-form finance videos.

This repo uses a deterministic render pipeline:

- React dashboard for creating render jobs
- Express API for job queue/status
- Remotion templates for frame-perfect video composition
- ffmpeg-backed H.264 MP4 rendering through Remotion
- Local font wiring so preview and export stay consistent

It intentionally avoids browser screenshot recording. The rendered MP4 is built
from known frames, which is much more reliable for 100+ videos/month.

## Quick Start

```bash
npm install
npm run dev
```

Open the Replit webview. Queue a render from the dashboard. Finished videos
appear in the job list with a download link.

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

## Fonts

Add these files under `public/fonts/`:

- `BebasNeue-Regular.woff2`
- `JetBrainsMono-Regular.woff2`
- `JetBrainsMono-Bold.woff2`

The template already references those local files. Local fonts are important:
they prevent the preview/export mismatch that caused crushed text in the old
browser capture system.

## API

Create a render job:

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
  "voiceover": "Script text",
  "caption": "Social caption"
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

## Current Scope

The first template is `CouldaMadeFinance`, a 9:16 finance/investing short. It
renders the core story:

1. "this is what would've happened"
2. investment setup
3. hold/pause beat
4. result reveal
5. perspective beat
6. CTA

## Next Production Steps

- Add real scenario fetching from couldamade.com.
- Add script/caption generation.
- Add voiceover audio generation and mix it into the Remotion render.
- Store completed videos in S3, Cloudflare R2, or another durable file store if
  Replit filesystem persistence is not enough.
- Add batch creation for 10, 25, or 100 videos at a time.

## Why This Architecture

The previous browser capture approach recorded the screen by repeatedly
converting DOM to canvas. That is fragile for fonts, animation timing, audio
sync, and MP4 compatibility.

This repo renders frames deterministically with Remotion and encodes with
ffmpeg, which is the right foundation for a repeatable content engine.
