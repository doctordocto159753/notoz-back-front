-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "Theme" AS ENUM ('light', 'dark');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PanelCollapsed" AS ENUM ('none', 'left', 'right');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "AlarmStatus" AS ENUM ('scheduled', 'fired', 'dismissed', 'missed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "AlarmRepeat" AS ENUM ('none', 'daily', 'weekly');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "username" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");

CREATE TABLE IF NOT EXISTS "Settings" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "theme" "Theme" NOT NULL DEFAULT 'light',
  "usePersianDigits" BOOLEAN NOT NULL DEFAULT false,
  "splitRatio" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "collapsed" "PanelCollapsed" NOT NULL DEFAULT 'none',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Settings_userId_key" ON "Settings"("userId");

ALTER TABLE "Settings"
  DROP CONSTRAINT IF EXISTS "Settings_userId_fkey";
ALTER TABLE "Settings"
  ADD CONSTRAINT "Settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "Tag" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "colorKey" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Tag_userId_idx" ON "Tag"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "Tag_userId_title_key" ON "Tag"("userId", "title");

ALTER TABLE "Tag"
  DROP CONSTRAINT IF EXISTS "Tag_userId_fkey";
ALTER TABLE "Tag"
  ADD CONSTRAINT "Tag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "ChecklistItem" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "descriptionHtml" TEXT NOT NULL DEFAULT '',
  "checked" BOOLEAN NOT NULL DEFAULT false,
  "pinned" BOOLEAN NOT NULL DEFAULT false,
  "archived" BOOLEAN NOT NULL DEFAULT false,
  "orderIndex" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMPTZ(3),
  CONSTRAINT "ChecklistItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ChecklistItem_userId_archived_pinned_checked_idx" ON "ChecklistItem"("userId", "archived", "pinned", "checked");
CREATE INDEX IF NOT EXISTS "ChecklistItem_userId_orderIndex_idx" ON "ChecklistItem"("userId", "orderIndex");

ALTER TABLE "ChecklistItem"
  DROP CONSTRAINT IF EXISTS "ChecklistItem_userId_fkey";
ALTER TABLE "ChecklistItem"
  ADD CONSTRAINT "ChecklistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "NoteBlock" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "contentJson" JSONB NOT NULL,
  "searchText" TEXT NOT NULL DEFAULT '',
  "pinned" BOOLEAN NOT NULL DEFAULT false,
  "archived" BOOLEAN NOT NULL DEFAULT false,
  "orderIndex" INTEGER NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMPTZ(3),
  CONSTRAINT "NoteBlock_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "NoteBlock_userId_archived_pinned_idx" ON "NoteBlock"("userId", "archived", "pinned");
CREATE INDEX IF NOT EXISTS "NoteBlock_userId_orderIndex_idx" ON "NoteBlock"("userId", "orderIndex");

ALTER TABLE "NoteBlock"
  DROP CONSTRAINT IF EXISTS "NoteBlock_userId_fkey";
ALTER TABLE "NoteBlock"
  ADD CONSTRAINT "NoteBlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "Alarm" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "at" TIMESTAMPTZ(3) NOT NULL,
  "repeat" "AlarmRepeat" NOT NULL DEFAULT 'none',
  "snoozeMinutes" INTEGER,
  "firedAt" TIMESTAMPTZ(3),
  "status" "AlarmStatus" NOT NULL DEFAULT 'scheduled',
  "checklistItemId" TEXT,
  "noteBlockId" TEXT,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Alarm_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Alarm_userId_status_at_idx" ON "Alarm"("userId", "status", "at");
CREATE UNIQUE INDEX IF NOT EXISTS "Alarm_checklistItemId_key" ON "Alarm"("checklistItemId");
CREATE UNIQUE INDEX IF NOT EXISTS "Alarm_noteBlockId_key" ON "Alarm"("noteBlockId");

ALTER TABLE "Alarm"
  DROP CONSTRAINT IF EXISTS "Alarm_userId_fkey";
ALTER TABLE "Alarm"
  ADD CONSTRAINT "Alarm_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Alarm"
  DROP CONSTRAINT IF EXISTS "Alarm_checklistItemId_fkey";
ALTER TABLE "Alarm"
  ADD CONSTRAINT "Alarm_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "ChecklistItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Alarm"
  DROP CONSTRAINT IF EXISTS "Alarm_noteBlockId_fkey";
ALTER TABLE "Alarm"
  ADD CONSTRAINT "Alarm_noteBlockId_fkey" FOREIGN KEY ("noteBlockId") REFERENCES "NoteBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "MediaAsset" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "userId" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "ext" TEXT NOT NULL,
  "width" INTEGER,
  "height" INTEGER,
  "sizeBytes" INTEGER NOT NULL,
  "path" TEXT NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "MediaAsset_userId_idx" ON "MediaAsset"("userId");

ALTER TABLE "MediaAsset"
  DROP CONSTRAINT IF EXISTS "MediaAsset_userId_fkey";
ALTER TABLE "MediaAsset"
  ADD CONSTRAINT "MediaAsset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Implicit many-to-many tables
CREATE TABLE IF NOT EXISTS "_ChecklistItemToTag" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "_ChecklistItemToTag_AB_unique" ON "_ChecklistItemToTag"("A", "B");
CREATE INDEX IF NOT EXISTS "_ChecklistItemToTag_B_index" ON "_ChecklistItemToTag"("B");

ALTER TABLE "_ChecklistItemToTag"
  DROP CONSTRAINT IF EXISTS "_ChecklistItemToTag_A_fkey";
ALTER TABLE "_ChecklistItemToTag"
  ADD CONSTRAINT "_ChecklistItemToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "ChecklistItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_ChecklistItemToTag"
  DROP CONSTRAINT IF EXISTS "_ChecklistItemToTag_B_fkey";
ALTER TABLE "_ChecklistItemToTag"
  ADD CONSTRAINT "_ChecklistItemToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE IF NOT EXISTS "_NoteBlockToTag" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "_NoteBlockToTag_AB_unique" ON "_NoteBlockToTag"("A", "B");
CREATE INDEX IF NOT EXISTS "_NoteBlockToTag_B_index" ON "_NoteBlockToTag"("B");

ALTER TABLE "_NoteBlockToTag"
  DROP CONSTRAINT IF EXISTS "_NoteBlockToTag_A_fkey";
ALTER TABLE "_NoteBlockToTag"
  ADD CONSTRAINT "_NoteBlockToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "NoteBlock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_NoteBlockToTag"
  DROP CONSTRAINT IF EXISTS "_NoteBlockToTag_B_fkey";
ALTER TABLE "_NoteBlockToTag"
  ADD CONSTRAINT "_NoteBlockToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
