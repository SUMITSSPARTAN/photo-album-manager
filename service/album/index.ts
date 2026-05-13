import db from "../../config/prismaClient.ts";
import { Prisma } from "../../generated/prisma/client.ts";

type AlbumDto = {
    id: string;
    name: string;
    contentSize: number;
    createdAt: Date;
    deletedAt: Date | null;
};

type ServiceError = { ok: false; status: number; message: string };
export type ServiceResult<T> = { ok: true; data: T } | ServiceError;

const albumSelect = {
    id: true,
    name: true,
    contentSize: true,
    createdAt: true,
    deletedAt: true,
} satisfies Prisma.AlbumSelect;

const serviceError = (status: number, message: string): ServiceError => ({ ok: false, status, message });

const isKnownPrismaError = (error: unknown): error is Prisma.PrismaClientKnownRequestError =>
    error instanceof Prisma.PrismaClientKnownRequestError;

const normalizeAlbumName = (name: string) => name.trim();

const handleAlbumWriteError = (error: unknown, fallbackMessage: string): ServiceError => {
    if (isKnownPrismaError(error)) {
        if (error.code === "P2002") {
            return serviceError(409, "Album with the same name already exists for the user");
        }

        if (error.code === "P2025") {
            return serviceError(404, "Album not found");
        }
    }

    console.error(fallbackMessage, error);
    return serviceError(500, fallbackMessage);
};

export const createAlbum = async (userId: string, name: string): Promise<ServiceResult<AlbumDto>> => {
    try {
        const album = await db.album.create({
            data: {
                userId,
                name: normalizeAlbumName(name),
            },
            select: albumSelect,
        });

        return { ok: true, data: album };
    } catch (error) {
        return handleAlbumWriteError(error, "Failed to create album");
    }
};

export const getAlbumsByUserId = async (userId: string): Promise<ServiceResult<AlbumDto[]>> => {
    try {
        const albums = await db.album.findMany({
            where: {
                userId,
                deletedAt: null,
            },
            select: albumSelect,
            orderBy: { createdAt: "desc" },
        });

        return { ok: true, data: albums };
    } catch (error) {
        console.error("Failed to fetch albums", error);
        return serviceError(500, "Failed to fetch albums");
    }
};

export const deleteAlbums = async (userId: string, albumIds: string[]): Promise<ServiceResult<{ deletedCount: number }>> => {
    try {
        const deletedCount = await db.$transaction(async (tx) => {
            const albums = await tx.album.findMany({
                where: {
                    userId,
                    id: { in: albumIds },
                    deletedAt: null,
                },
                select: {
                    id: true,
                },
            });

            if (albums.length !== albumIds.length) {
                throw serviceError(404, "One or more albums were not found");
            }

            const deletedAt = new Date();

            await tx.album.updateMany({
                where: {
                    userId,
                    id: { in: albumIds },
                    deletedAt: null,
                },
                data: { deletedAt },
            });

            await tx.photo.updateMany({
                where: {
                    albumId: { in: albumIds },
                    deletedAt: null,
                },
                data: { deletedAt },
            });

            return albums.length;
        });

        return { ok: true, data: { deletedCount } };
    } catch (error) {
        if (typeof error === "object" && error !== null && "ok" in error && !error.ok) {
            return error as ServiceError;
        }

        console.error("Failed to delete albums", error);
        return serviceError(500, "Failed to delete albums");
    }
};

export const getDeletedAlbumsByUserId = async (userId: string): Promise<ServiceResult<AlbumDto[]>> => {
    try {
        const albums = await db.album.findMany({
            where: {
                userId,
                deletedAt: { not: null },
            },
            select: albumSelect,
            orderBy: { createdAt: "desc" },
        });

        return { ok: true, data: albums };
    } catch (error) {
        console.error("Failed to fetch deleted albums", error);
        return serviceError(500, "Failed to fetch deleted albums");
    }
};

export const restoreAlbums = async (userId: string, albumIds?: string[]): Promise<ServiceResult<AlbumDto[]>> => {
    try {
        const restoredAlbums = await db.$transaction(async (tx) => {
            const where: Prisma.AlbumWhereInput = {
                userId,
                deletedAt: { not: null },
            };

            if (albumIds && albumIds.length > 0) {
                where.id = { in: albumIds };
            }

            const albums = await tx.album.findMany({
                where,
                select: {
                    id: true,
                    deletedAt: true,
                },
            });

            if (albumIds && albumIds.length > 0 && albums.length !== albumIds.length) {
                throw serviceError(404, "One or more albums were not found");
            }

            const restored = await Promise.all(
                albums.map((album) =>
                    tx.album.update({
                        where: { id: album.id },
                        data: { deletedAt: null },
                        select: albumSelect,
                    }),
                ),
            );

            await Promise.all(
                albums.map((album) =>
                    tx.photo.updateMany({
                        where: {
                            albumId: album.id,
                            deletedAt: album.deletedAt,
                        },
                        data: { deletedAt: null },
                    }),
                ),
            );

            return restored;
        });

        return { ok: true, data: restoredAlbums };
    } catch (error) {
        if (typeof error === "object" && error !== null && "ok" in error && !error.ok) {
            return error as ServiceError;
        }

        console.error("Failed to restore albums", error);
        return serviceError(500, "Failed to restore albums");
    }
};
