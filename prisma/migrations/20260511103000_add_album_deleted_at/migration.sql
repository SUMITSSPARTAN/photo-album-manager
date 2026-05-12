ALTER TABLE "Album"
ADD COLUMN "deletedAt" TIMESTAMP(3);

UPDATE "Album"
SET "deletedAt" = CURRENT_TIMESTAMP
WHERE "id" LIKE 'D*%';

UPDATE "Album"
SET "id" = SUBSTRING("id" FROM 3)
WHERE "id" LIKE 'D*%';
