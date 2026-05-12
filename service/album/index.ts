import db from "../../config/prismaClient.ts";
import type { Prisma } from "../../generated/prisma/client.ts";

export const createAlbum = async (userId: string, name: string) => {
    try {
        const existingAlbum = await db.album.findFirst({
            where: {
                userId,
                name,
                deletedAt: null,
            }
        });

        if (existingAlbum) {
            throw new Error("Album with the same name already exists for the user");
        }

        return await db.album.create({
            data: {
                userId,
                name,
                createdAt: new Date()
            }
        });
    } catch (error) {
        console.error("Error creating album:", error);
        throw new Error("Failed to create album");
    }
}

export const getAlbumsByUserId = async (userId: string) => {
    try {
        return await db.album.findMany({
            where: {
                userId,
                deletedAt: null,
            }
        });
    } catch (error) {
        console.error("Error fetching albums:", error);
        throw new Error("Failed to fetch albums");
    }
}

export const getAlbumById = async (albumId: string) => {
    try {
        return await db.album.findUnique({
            where: { id: albumId }
        });
    } catch (error) {
        console.error("Error fetching album:", error);
        throw new Error("Failed to fetch album");
    }
}

export const deleteAlbums = async (userId: string, albumIds: string[]) => {
    try {
        const albums = await db.album.findMany({
            where: {
                userId,
                id: {
                    in: albumIds,
                },
                deletedAt: null,
            }
        });

        if (albums.length !== albumIds.length) {
            throw new Error("One or more albums were not found");
        }

        return await db.$transaction(
            albums.map((album) =>
                db.album.update({
                    where: { id: album.id },
                    data: { deletedAt: new Date() }
                })
            )
        );
    } catch (error) {
        console.error("Error deleting albums:", error);
        throw error instanceof Error ? error : new Error("Failed to delete albums");
    }
}

export const getDeletedAlbumsByUserId = async (userId: string) => {
    try {
        return await db.album.findMany({
            where: {
                userId,
                deletedAt: {
                    not: null,
                },
            }
        });
    } catch (error) {
        console.error("Error fetching deleted albums:", error);
        throw new Error("Failed to fetch deleted albums");
    }
}

export const restoreAlbums = async (userId: string, albumIds?: string[]) => {
    try {
        const where: Prisma.AlbumWhereInput = {
            userId,
            deletedAt: {
                not: null,
            }
        };

        if (albumIds && albumIds.length > 0) {
            where.id = {
                in: albumIds,
            };
        }

        const albums = await db.album.findMany({
            where
        });

        if (albumIds && albumIds.length > 0 && albums.length !== albumIds.length) {
            throw new Error("One or more albums were not found");
        }

        return await db.$transaction(
            albums.map((album) =>
                db.album.update({
                    where: {
                        id: album.id
                    },
                    data: {
                        deletedAt: null,
                    }
                })
            )
        );

    } catch (error) {
        console.error("Error restoring albums:", error);
        throw error instanceof Error ? error : new Error("Failed to restore albums");
    }
};
