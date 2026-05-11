import db from "../../config/prismaClient.ts";

const deletedIdPrefix = "D*";

export const createAlbum = async (userId: string, name: string) => {
    try {
        const existingAlbum = await db.album.findFirst({
            where: {
                userId,
                name,
                id: {
                    not: {
                        startsWith: deletedIdPrefix
                    }
                }
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
                id: {
                    not: {
                        startsWith: deletedIdPrefix
                    }
                }
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

const getAlbumsById = async (userId: string, albumId: string) => {
    return await db.album.findFirst({
        where: {
            id: albumId,
            userId
        }
    });
};

export const deleteAlbum = async (userId: string, albumId: string) => {
    try {
        const album = await getAlbumsById(userId, albumId);

        if (!album || album.id.startsWith(deletedIdPrefix)) {
            throw new Error("Album not found");
        }

        return await db.album.update({
            where: { id: albumId },
            data: { id: `${deletedIdPrefix}${albumId}` }
        });
    } catch (error) {
        console.error("Error deleting album:", error);
        throw error instanceof Error ? error : new Error("Failed to delete album");
    }
}

export const deleteAlbums = async (userId: string, albumIds: string[]) => {
    try {
        const albums = await db.album.findMany({
            where: {
                userId,
                id: {
                    in: albumIds,
                    not: {
                        startsWith: deletedIdPrefix
                    }
                }
            }
        });

        if (albums.length !== albumIds.length) {
            throw new Error("One or more albums were not found");
        }

        return await db.$transaction(
            albums.map((album) =>
                db.album.update({
                    where: { id: album.id },
                    data: { id: `${deletedIdPrefix}${album.id}` }
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
                id: {
                    startsWith: deletedIdPrefix
                }
            }
        });
    } catch (error) {
        console.error("Error fetching deleted albums:", error);
        throw new Error("Failed to fetch deleted albums");
    }
}

export const restoreAlbum = async (userId: string, albumId: string) => {
    try {
        const album = await getAlbumsById(userId, albumId);

        if (!album || !album.id.startsWith(deletedIdPrefix)) {
            throw new Error("Album not found");
        }

        return await db.album.update({
            where: { id: albumId },
            data: { id: album.id.replace(/^D\*/, "") }
        });
    } catch (error) {
        console.error("Error restoring album:", error);
        throw error instanceof Error ? error : new Error("Failed to restore album");
    }
}

export const restoreSelectedAlbums = async (userId: string, albumIds: string[]) => {
    try {
        const albums = await db.album.findMany({
            where: {
                userId,
                id: {
                    in: albumIds,
                    startsWith: deletedIdPrefix
                }
            }
        });

        if (albums.length !== albumIds.length) {
            throw new Error("One or more albums were not found");
        }

        return await db.$transaction(
            albums.map((album) =>
                db.album.update({
                    where: {
                        id: album.id
                    },
                    data: {
                        id: album.id.replace(/^D\*/, "")
                    }
                })
            )
        );

    } catch (error) {
        console.error("Error restoring albums:", error);
        throw error instanceof Error ? error : new Error("Failed to restore albums");
    }
};
