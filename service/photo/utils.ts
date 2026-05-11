import db from "../../config/prismaClient.ts";

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
