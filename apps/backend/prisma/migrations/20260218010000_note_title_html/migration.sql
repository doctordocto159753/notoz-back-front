-- Add UI fields for note blocks (title + html preview)
ALTER TABLE "NoteBlock" ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT '';
ALTER TABLE "NoteBlock" ADD COLUMN IF NOT EXISTS "html" TEXT NOT NULL DEFAULT '';
