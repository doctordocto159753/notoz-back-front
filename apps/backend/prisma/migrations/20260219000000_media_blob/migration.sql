-- CreateEnum
CREATE TYPE "MediaStorage" AS ENUM ('fs', 'blob');

-- AlterTable
ALTER TABLE "MediaAsset" ADD COLUMN     "storage" "MediaStorage" NOT NULL DEFAULT 'fs';
ALTER TABLE "MediaAsset" ADD COLUMN     "url" TEXT;
ALTER TABLE "MediaAsset" ADD COLUMN     "pathname" TEXT;
ALTER TABLE "MediaAsset" ALTER COLUMN "path" DROP NOT NULL;
