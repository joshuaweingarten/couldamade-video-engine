# Server Notes

The queue is intentionally simple for the first Replit version:

- one render at a time
- in-memory queue
- persisted job metadata in `data/jobs.json`
- finished MP4s, SRT captions, and JSON metadata in `renders/`
- idea generation that runs locally without paid APIs
- batch queue endpoint capped at 25 videos per request

This keeps the app easy to run on Replit. If render volume grows, replace this
with a real queue such as BullMQ/Redis and move files to object storage.
