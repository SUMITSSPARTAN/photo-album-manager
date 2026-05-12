import zod from "zod";

export const createAlbumSchema = zod.object({
    albumName: zod.string().min(1, "albumName is required"),
});

export const deleteAlbumsBodySchema = zod.object({
    albumIds: zod.array(zod.string().cuid2("Invalid album ID")).min(1, "albumIds must be a non-empty array"),
});

export const restoreAlbumsBodySchema = zod.object({
    albumIds: zod.array(zod.string().cuid2("Invalid album ID")).min(1, "albumIds must be a non-empty array").optional(),
});
