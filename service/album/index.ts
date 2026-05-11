import db from "../../config/prismaClient.ts";

export const createAlbum = async (userId: string, name: string) => {
    try {
        const existingAlbum = await getAlbumsByUserId(userId).then(albums => albums.find(album => album.name === name));
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
            where: { userId }
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

export const deleteAlbum = async (albumId: string) => {
    try {
        return await db.album.delete({
            where: { id: albumId }
        });
    } catch (error) {
        console.error("Error deleting album:", error);
        throw new Error("Failed to delete album");
    }
}