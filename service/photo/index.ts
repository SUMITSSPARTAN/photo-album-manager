import type { Prisma } from "../../generated/prisma/client.ts";
import db from "../../config/prismaClient.ts";
import { getUserById } from "../user/index.ts";
import { getAlbumsByUserId } from "../album/index.ts";
import { updateAlbum, deleteFile } from "./utils.ts";

type CreatePhotoInput = {
  userId: string;
  albumId: string;
  path: string;
  type: string;
  size: number;
  encoding: string;
  originalName: string;
};

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

export const getPhotoById = async (photoId: string) => {
  try {
    return await db.photo.findUnique({
      where: { id: photoId },
    });
  } catch (error) {
    console.error("Error fetching photo:", error);
    throw new Error("Failed to fetch photo");
  }
};

export const deletePhoto = async (photoId: string) => {
  try {
    const photo = await db.photo.delete({
      where: { id: photoId },
    });

    await updateAlbum(photo.albumId!, -1);
    await deleteFile(photo.path);

    return photo;
  } catch (error) {
    console.error("Error deleting photo:", error);
    throw new Error("Failed to delete photo");
  }
};

export const deletePhotos = async (photoIds: string[]) => {
  try {
    const results = await Promise.allSettled(photoIds.map((photoId) => deletePhoto(photoId)));

    const deletedPhotos = results
      .filter((result): result is PromiseFulfilledResult<Awaited<ReturnType<typeof deletePhoto>>> => result.status === "fulfilled")
      .map((result) => result.value);

    const failures = results
      .filter((result): result is PromiseRejectedResult => result.status === "rejected")
      .map((result, index) => ({
        photoId: photoIds[index],
        error: result.reason instanceof Error ? result.reason.message : "Failed to delete photo",
      }));

    if (failures.length > 0) console.error("Failed to delete some photos:", failures);
    
    return deletedPhotos;
  } catch (error) {
    console.error("Error deleting photos:", error);
    throw new Error("Failed to delete photos");
  }
};

export const getPhotosByAlbumId = async (albumId: string) => {
  try {
    return await db.photo.findMany({
      where: { albumId },
    });
  } catch (error) {
    console.error("Error fetching photos:", error);
    throw new Error("Failed to fetch photos");
  }
};

export const movePhotoToAnotherAlbum = async (photoId: string, albumId: string) => {
  try {
    const photo = await getPhotoById(photoId);
    if (!photo) {
      throw new Error("Photo not found");
    }

    const albums = await getAlbumsByUserId(photo.userId);
    const albumExists = albums.some((album) => album.id === albumId);
    if (!albumExists) {
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
    throw new Error("Failed to move photo");
  }
};
