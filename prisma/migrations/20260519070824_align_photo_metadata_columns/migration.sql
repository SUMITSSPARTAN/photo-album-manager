/*
  Warnings:

  - A unique constraint covering the columns `[userId,name]` on the table `Album` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Photo" DROP CONSTRAINT "Photo_albumId_fkey";

-- DropIndex
DROP INDEX "Album_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "Album_userId_name_key" ON "Album"("userId", "name");

-- AddForeignKey
ALTER TABLE "Photo" ADD CONSTRAINT "Photo_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;
