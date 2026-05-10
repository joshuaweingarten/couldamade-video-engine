# Server Notes

The queue is intentionally simple for the first Replit version:

- one render at a time
- in-memory queue
- persisted job metadata in `data/jobs.json`
- finished MP4s in `renders/`

This keeps the app easy to run on Replit. If render volume grows, replace this
with a real queue such as BullMQ/Redis and move files to object storage.
