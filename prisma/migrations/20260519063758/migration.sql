ALTER TABLE "Photo" ADD COLUMN "encoding" TEXT;
ALTER TABLE "Photo" ADD COLUMN "originalName" TEXT;

UPDATE "Photo"
SET
  "encoding" = COALESCE("metadata"->>'encoding', ''),
  "originalName" = COALESCE("metadata"->>'originalName', '');

ALTER TABLE "Photo" ALTER COLUMN "encoding" SET NOT NULL;
ALTER TABLE "Photo" ALTER COLUMN "originalName" SET NOT NULL;

-- Only do this if you have no NULL albumId rows.
ALTER TABLE "Photo" ALTER COLUMN "albumId" SET NOT NULL;

ALTER TABLE "Photo" DROP COLUMN "metadata";