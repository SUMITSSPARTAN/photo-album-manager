import db from "../../config/prismaClient.ts";
import type { Prisma } from "../../generated/prisma/client.ts";

const deletedAlbumIdPrefix = "D*";

type CreatePhotoInput = {
  userId: string;
  albumId: string;
  path: string;
  type: string;
  size: number;
  encoding: string;
  originalName: string;
};

type PhotoQueryParams = {
  photoId?: string;
  albumId?: string;
  includeDeleted?: boolean;
  onlyDeleted?: boolean;
};

const updateAlbumContentSize = async (albumId: string, sizeDelta: number) => {
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

export const createPhotos = async (photos: CreatePhotoInput[]) => {
  try {
    const createdPhotos = [];
    for (const photoData of photos) {
      const album = await db.album.findFirst({
        where: {
          id: photoData.albumId,
          userId: photoData.userId,
        },
      });

      if (!album) {
        throw new Error("Album not found for the user");
      }

      const metadata: Prisma.InputJsonValue = {
        originalName: photoData.originalName,
        encoding: photoData.encoding,
      };

      const createdPhoto = await db.photo.create({
        data: {
          userId: photoData.userId,
          albumId: photoData.albumId,
          path: photoData.path,
          type: photoData.type,
          size: photoData.size,
          metadata,
        },
      });

      await updateAlbumContentSize(photoData.albumId, 1);
      createdPhotos.push(createdPhoto);
    }
    return createdPhotos;
  } catch (error) {
    console.error("Error creating photos:", error);
    throw error instanceof Error ? error : new Error("Failed to create photos");
  }
};

export const deletePhotos = async (userId: string, photoIds: string[]) => {
  try {
    const photos = await db.photo.findMany({
      where: {
        userId,
        id: {
          in: photoIds,
        },
        deletedAt: null,
      },
    });

    if (photos.length !== photoIds.length) {
      throw new Error("One or more photos were not found");
    }

    const deletedPhotos = [];
    for (const photo of photos) {
      const deletedPhoto = await db.photo.update({
        where: { id: photo.id },
        data: { deletedAt: new Date() }
      });

      await updateAlbumContentSize(deletedPhoto.albumId!, -1);
      deletedPhotos.push(deletedPhoto);
    }

    return deletedPhotos;
  } catch (error) {
    console.error("Error deleting photos:", error);
    throw error instanceof Error ? error : new Error("Failed to delete photos");
  }
};

export const restorePhotos = async (userId: string, photoIds?: string[]) => {
  try {
    const where: Prisma.PhotoWhereInput = {
      userId,
      deletedAt: {
        not: null,
      },
    };

    if (photoIds && photoIds.length > 0) {
      where.id = {
        in: photoIds,
      };
    }

    const deletedPhotos = await db.photo.findMany({
      where,
    });

    if (photoIds && photoIds.length > 0 && deletedPhotos.length !== photoIds.length) {
      throw new Error("One or more photos were not found");
    }

    const restoredPhotos = [];
    for (const photo of deletedPhotos) {
      const restoredPhoto = await db.photo.update({
        where: { id: photo.id },
        data: { deletedAt: null }
      });

      await updateAlbumContentSize(restoredPhoto.albumId!, 1);
      restoredPhotos.push(restoredPhoto);
    }

    return restoredPhotos;
  } catch (error) {
    console.error("Error restoring photos:", error);
    throw error instanceof Error ? error : new Error("Failed to restore photos");
  }
};

export const getPhotoById = async (userId: string, photoId: string) => {
  try {
    const photos = await getPhotos(userId, { photoId });
    return photos[0] ?? null;
  } catch (error) {
    console.error("Error fetching photo:", error);
    throw new Error("Failed to fetch photo");
  }
};

const getPhotos = async (userId: string, params: PhotoQueryParams) => {
  const { photoId, albumId, includeDeleted = false, onlyDeleted = false } = params;

  const where: Prisma.PhotoWhereInput = {
    userId,
  };

  if (photoId) {
    where.id = photoId;
  }

  if (albumId) {
    where.albumId = albumId;
  }

  if (onlyDeleted) {
    where.deletedAt = {
      not: null,
    };
  } else if (!includeDeleted) {
    where.deletedAt = null;
  }

  return await db.photo.findMany({
    where,
    orderBy: { uploadedAt: "desc" },
  });
};

export const getPhotosByAlbumId = async (userId: string, albumId: string) => {
  try {
    return await getPhotos(userId, { albumId });
  } catch (error) {
    console.error("Error fetching photos:", error);
    throw new Error("Failed to fetch photos");
  }
};

export const getDeletedPhotosByUserId = async (userId: string) => {
  try {
    return await getPhotos(userId, { onlyDeleted: true });
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
                startsWith: deletedAlbumIdPrefix,
              },
            },
          },
        ],
      },
    });

    if (!album) {
      throw new Error("New album not found for the user");
    }

    if (photo.deletedAt) {
      throw new Error("Photo not found");
    }

    await updateAlbumContentSize(photo.albumId!, -1);
    await updateAlbumContentSize(albumId, 1);

    return await db.photo.update({
      where: { id: photoId },
      data: { albumId: albumId },
    });

  } catch (error) {
    console.error("Error moving photo:", error);
    throw error instanceof Error ? error : new Error("Failed to move photo");
  }
};
