import db from "../../config/prismaClient.ts";
import fs from 'node:fs/promises';

export async function deleteFile(path: string) {
  try {
    await fs.unlink(path);
    console.log(`Successfully deleted ${path}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error deleting file:", message);
  }
}

export const updateAlbum = async (albumId: string, sizeDelta: number) => {
  if (sizeDelta === 0) {
    return;
  }

  await db.album.update({
    where: { id: albumId },
    data: {
      contentSize:
        sizeDelta > 0
          ? { increment: sizeDelta }
          : { decrement: Math.abs(sizeDelta) },
    },
  });
};
