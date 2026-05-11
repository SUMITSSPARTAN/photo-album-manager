import type { Prisma } from "../../generated/prisma/client.ts";
import db from "../../config/prismaClient.ts";
import { updateAlbum } from "./utils.ts";

type CreatePhotoInput = {
  userId: string;
  albumId: string;
  path: string;
  type: string;
  size: number;
  encoding: string;
  originalName: string;
};

const deletedIdPrefix = "D*";

export const createPhoto = async ({
  userId,
  albumId,
  path,
  type,
  size,
  encoding,
  originalName,
}: CreatePhotoInput) => {
  try {
    const album = await db.album.findFirst({
      where: {
        id: albumId,
        userId,
      },
    });
    if (!album) throw new Error("Album not found for the user");

    const metadata: Prisma.InputJsonValue = {
      originalName,
      encoding,
    };

    const photo = await db.photo.create({
      data: {
        userId,
        albumId,
        path,
        type,
        size,
        metadata,
      },
    });

    await updateAlbum(albumId, 1);
    return photo;
  } catch (error) {
    console.error("Error creating photo:", error);
    throw error instanceof Error ? error : new Error("Failed to create photo");
  }
};

export const createPhotos = async (photos: CreatePhotoInput[]) => {
  try {
    const createdPhotos = [];
    for (const photoData of photos) {
      const createdPhoto = await createPhoto(photoData);
      createdPhotos.push(createdPhoto);
    }
    return createdPhotos;
  } catch (error) {
    console.error("Error creating photos:", error);
    throw error instanceof Error ? error : new Error("Failed to create photos");
  }
};

export const getPhotoById = async (userId: string, photoId: string) => {
  try {
    return await db.photo.findFirst({
      where: {
        id: photoId,
        userId,
      },
    });
  } catch (error) {
    console.error("Error fetching photo:", error);
    throw new Error("Failed to fetch photo");
  }
};

const getPhotosById = async (userId: string, photoId: string) => {
  return await db.photo.findFirst({
    where: {
      id: photoId,
      userId,
    },
  });
};

export const deletePhoto = async (userId: string, photoId: string) => {
  try {
    const ownedPhoto = await getPhotosById(userId, photoId);

    if (!ownedPhoto || ownedPhoto.id.startsWith(deletedIdPrefix)) {
      throw new Error("Photo not found");
    }

    const deletedPhoto = await db.photo.update({
      where: { id: photoId },
      data: { id: `${deletedIdPrefix}${photoId}` }
    });

    await updateAlbum(deletedPhoto.albumId!, -1);

    return deletedPhoto;
  } catch (error) {
    console.error("Error deleting photo:", error);
    throw error instanceof Error ? error : new Error("Failed to delete photo");
  }
};

export const deletePhotos = async (userId: string, photoIds: string[]) => {
  try {
    const photos = await db.photo.findMany({
      where: {
        userId,
        id: {
          in: photoIds,
          not: {
            startsWith: deletedIdPrefix,
          },
        },
      },
    });

    if (photos.length !== photoIds.length) {
      throw new Error("One or more photos were not found");
    }

    return await Promise.all(photos.map((photo) => deletePhoto(userId, photo.id)));
  } catch (error) {
    console.error("Error deleting photos:", error);
    throw error instanceof Error ? error : new Error("Failed to delete photos");
  }
};

export const restorePhoto = async (userId: string, photoId: string) => {
  try {
    const ownedPhoto = await getPhotosById(userId, photoId);

    if (!ownedPhoto || !ownedPhoto.id.startsWith(deletedIdPrefix)) {
      throw new Error("Photo not found");
    }

    const restoredPhoto = await db.photo.update({
      where: { id: photoId },
      data: { id: ownedPhoto.id.replace(/^D\*/, "") }
    });

    await updateAlbum(restoredPhoto.albumId!, 1);
    return restoredPhoto;
  } catch (error) {
    console.error("Error restoring photo:", error);
    throw error instanceof Error ? error : new Error("Failed to restore photo");
  }
};

export const restorePhotos = async (userId: string) => {
  try {
    const deletedPhotos = await db.photo.findMany({
      where: {
        userId,
        id: { startsWith: deletedIdPrefix }
      }
    });

    const restorePromises = deletedPhotos.map((photo) => restorePhoto(userId, photo.id));
    return await Promise.all(restorePromises);
  } catch (error) {
    console.error("Error restoring photos:", error);
    throw error instanceof Error ? error : new Error("Failed to restore photos");
  }
};

export const getPhotosByAlbumId = async (userId: string, albumId: string) => {
  try {
    return await db.photo.findMany({
      where: {
        userId,
        albumId,
        NOT: {
          id: {
            startsWith: deletedIdPrefix
          }
        }
      },
      orderBy: { uploadedAt: "desc" }
    });
  } catch (error) {
    console.error("Error fetching photos:", error);
    throw new Error("Failed to fetch photos");
  }
};

export const getDeletedPhotosByUserId = async (userId: string) => {
  try {
    return await db.photo.findMany({
      where: {
        userId,
        id: { startsWith: deletedIdPrefix }
      },
      orderBy: { uploadedAt: "desc" }
    });
  } catch (error) {
    console.error("Error fetching deleted photos:", error);
    throw new Error("Failed to fetch deleted photos");
  }
};

export const movePhotoToAnotherAlbum = async (userId: string, photoId: string, albumId: string) => {
  try {
    const photo = await getPhotoById(userId, photoId);
    if (!photo) {
      throw new Error("Photo not found");
    }

    const album = await db.album.findFirst({
      where: {
        userId,
        AND: [
          { id: albumId },
          {
            id: {
              not: {
                startsWith: deletedIdPrefix,
              },
            },
          },
        ],
      },
    });

    if (!album) {
      throw new Error("New album not found for the user");
    }

    await updateAlbum(photo.albumId!, -1);
    await updateAlbum(albumId, 1);

    return await db.photo.update({
      where: { id: photoId },
      data: { albumId: albumId },
    });

  } catch (error) {
    console.error("Error moving photo:", error);
    throw error instanceof Error ? error : new Error("Failed to move photo");
  }
};
