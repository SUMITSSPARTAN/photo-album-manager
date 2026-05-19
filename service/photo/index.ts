import db from "../../config/prismaClient.ts";
import type { Prisma } from "../../generated/prisma/client.ts";

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

type PhotoDto = {
  id: string;
  path: string;
  type: string;
  size: number;
  metadata: {
    encoding: string;
    originalName: string;
  };
  uploadedAt: Date;
  albumId: string;
  deletedAt: Date | null;
};

type ServiceError = { ok: false; status: number; message: string };
export type ServiceResult<T> = { ok: true; data: T } | ServiceError;

const photoSelect = {
  id: true,
  path: true,
  type: true,
  size: true,
  encoding: true,
  originalName: true,
  uploadedAt: true,
  albumId: true,
  deletedAt: true,
} as const;

const serviceError = (status: number, message: string): ServiceError => ({ ok: false, status, message });

const toPhotoDto = (photo: {
  id: string;
  path: string;
  type: string;
  size: number;
  encoding: string;
  originalName: string;
  uploadedAt: Date;
  albumId: string;
  deletedAt: Date | null;
}): PhotoDto => ({
  id: photo.id,
  path: photo.path,
  type: photo.type,
  size: photo.size,
  metadata: {
    encoding: photo.encoding,
    originalName: photo.originalName,
  },
  uploadedAt: photo.uploadedAt,
  albumId: photo.albumId,
  deletedAt: photo.deletedAt,
});

const getPhotos = async (userId: string, params: PhotoQueryParams): Promise<PhotoDto[]> => {
  const { photoId, albumId, includeDeleted = false, onlyDeleted = false } = params;

  const where: {
    userId: string;
    id?: string;
    albumId?: string;
    deletedAt?: null | { not: null };
  } = { userId };

  if (photoId) {
    where.id = photoId;
  }

  if (albumId) {
    where.albumId = albumId;
  }

  if (onlyDeleted) {
    where.deletedAt = { not: null };
  } else if (!includeDeleted) {
    where.deletedAt = null;
  }

  const photos = await db.photo.findMany({
    where,
    select: photoSelect,
    orderBy: { uploadedAt: "desc" },
  });

  return photos.map(toPhotoDto);
};

export const createPhotos = async (photos: CreatePhotoInput[]): Promise<ServiceResult<PhotoDto[]>> => {
  try {
    if (photos.length === 0) {
      return serviceError(400, "Photo files are required");
    }

    const { albumId, userId } = photos[0]!;

    const createdPhotos = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const album = await tx.album.findFirst({
        where: {
          id: albumId,
          userId,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!album) {
        throw serviceError(404, "Album not found");
      }

      const insertedPhotos = await Promise.all(
        photos.map((photo) =>
          tx.photo.create({
            data: {
              userId: photo.userId,
              albumId: photo.albumId,
              path: photo.path,
              type: photo.type,
              size: photo.size,
              encoding: photo.encoding,
              originalName: photo.originalName,
            },
            select: photoSelect,
          }),
        ),
      );

      await tx.album.update({
        where: { id: albumId },
        data: { contentSize: { increment: insertedPhotos.length } },
      });

      return insertedPhotos;
    });

    return { ok: true, data: createdPhotos.map(toPhotoDto) };
  } catch (error) {
    if (typeof error === "object" && error !== null && "ok" in error && !error.ok) {
      return error as ServiceError;
    }

    console.error("Failed to create photos", error);
    return serviceError(500, "Failed to create photos");
  }
};

export const deletePhotos = async (userId: string, photoIds: string[]): Promise<ServiceResult<{ deletedCount: number }>> => {
  try {
    const deletedCount = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const photos = await tx.photo.findMany({
        where: {
          userId,
          id: { in: photoIds },
          deletedAt: null,
        },
        select: {
          id: true,
          albumId: true,
        },
      });

      if (photos.length !== photoIds.length) {
        throw serviceError(404, "One or more photos were not found");
      }

      await tx.photo.updateMany({
        where: {
          userId,
          id: { in: photoIds },
          deletedAt: null,
        },
        data: {
          deletedAt: new Date(),
        },
      });

      const albumCounts = new Map<string, number>();
      for (const photo of photos) {
        albumCounts.set(photo.albumId, (albumCounts.get(photo.albumId) ?? 0) + 1);
      }

      for (const [albumId, count] of albumCounts) {
        await tx.album.update({
          where: { id: albumId },
          data: { contentSize: { decrement: count } },
        });
      }

      return photos.length;
    });

    return { ok: true, data: { deletedCount } };
  } catch (error) {
    if (typeof error === "object" && error !== null && "ok" in error && !error.ok) {
      return error as ServiceError;
    }

    console.error("Failed to delete photos", error);
    return serviceError(500, "Failed to delete photos");
  }
};

export const restorePhotos = async (userId: string, photoIds?: string[]): Promise<ServiceResult<PhotoDto[]>> => {
  try {
    const restoredPhotos = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const where: {
        userId: string;
        deletedAt: { not: null };
        id?: { in: string[] };
      } = {
        userId,
        deletedAt: { not: null },
      };

      if (photoIds && photoIds.length > 0) {
        where.id = { in: photoIds };
      }

      const deletedPhotos = await tx.photo.findMany({
        where,
        select: {
          id: true,
          albumId: true,
        },
      });

      if (photoIds && photoIds.length > 0 && deletedPhotos.length !== photoIds.length) {
        throw serviceError(404, "One or more photos were not found");
      }

      const updatedPhotos = await Promise.all(
        deletedPhotos.map((photo) =>
          tx.photo.update({
            where: { id: photo.id },
            data: { deletedAt: null },
            select: photoSelect,
          }),
        ),
      );

      const albumCounts = new Map<string, number>();
      for (const photo of deletedPhotos) {
        albumCounts.set(photo.albumId, (albumCounts.get(photo.albumId) ?? 0) + 1);
      }

      for (const [albumId, count] of albumCounts) {
        await tx.album.update({
          where: { id: albumId },
          data: { contentSize: { increment: count } },
        });
      }

      return updatedPhotos;
    });

    return { ok: true, data: restoredPhotos.map(toPhotoDto) };
  } catch (error) {
    if (typeof error === "object" && error !== null && "ok" in error && !error.ok) {
      return error as ServiceError;
    }

    console.error("Failed to restore photos", error);
    return serviceError(500, "Failed to restore photos");
  }
};

export const getPhotoById = async (userId: string, photoId: string): Promise<ServiceResult<PhotoDto>> => {
  try {
    const photos = await getPhotos(userId, { photoId });
    const photo = photos[0];

    if (!photo) {
      return serviceError(404, "Photo not found");
    }

    return { ok: true, data: photo };
  } catch (error) {
    console.error("Failed to fetch photo", error);
    return serviceError(500, "Failed to fetch photo");
  }
};

export const getPhotosByUserId = async (userId: string): Promise<ServiceResult<PhotoDto[]>> => {
  try {
    const photos = await getPhotos(userId, {});
    return { ok: true, data: photos };
  } catch (error) {
    console.error("Failed to fetch photos", error);
    return serviceError(500, "Failed to fetch photos");
  }
};

export const getPhotosByAlbumId = async (userId: string, albumId: string): Promise<ServiceResult<PhotoDto[]>> => {
  try {
    const photos = await getPhotos(userId, { albumId });
    return { ok: true, data: photos };
  } catch (error) {
    console.error("Failed to fetch photos", error);
    return serviceError(500, "Failed to fetch photos");
  }
};

export const getDeletedPhotosByUserId = async (userId: string): Promise<ServiceResult<PhotoDto[]>> => {
  try {
    const photos = await getPhotos(userId, { onlyDeleted: true });
    return { ok: true, data: photos };
  } catch (error) {
    console.error("Failed to fetch deleted photos", error);
    return serviceError(500, "Failed to fetch deleted photos");
  }
};

export const movePhotoToAnotherAlbum = async (userId: string, photoId: string, albumId: string): Promise<ServiceResult<PhotoDto>> => {
  try {
    const movedPhoto = await db.$transaction(async (tx: Prisma.TransactionClient) => {
      const photo = await tx.photo.findFirst({
        where: {
          id: photoId,
          userId,
          deletedAt: null,
        },
        select: {
          id: true,
          albumId: true,
        },
      });

      if (!photo) {
        throw serviceError(404, "Photo not found");
      }

      const album = await tx.album.findFirst({
        where: {
          id: albumId,
          userId,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (!album) {
        throw serviceError(404, "Album not found");
      }

      if (photo.albumId !== albumId) {
        await tx.album.update({
          where: { id: photo.albumId },
          data: { contentSize: { decrement: 1 } },
        });

        await tx.album.update({
          where: { id: albumId },
          data: { contentSize: { increment: 1 } },
        });
      }

      return tx.photo.update({
        where: { id: photoId },
        data: { albumId },
        select: photoSelect,
      });
    });

    return { ok: true, data: toPhotoDto(movedPhoto) };
  } catch (error) {
    if (typeof error === "object" && error !== null && "ok" in error && !error.ok) {
      return error as ServiceError;
    }

    console.error("Failed to move photo", error);
    return serviceError(500, "Failed to move photo");
  }
};
