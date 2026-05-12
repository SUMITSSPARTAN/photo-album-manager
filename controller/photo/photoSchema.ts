import zod from "zod";

export const createPhotoSchema = zod.object({
    albumId: zod.string().cuid2("Invalid album ID"),
});

export const getPhotoByIdParamsSchema = zod.object({
    id: zod.string().cuid2("Invalid photo ID"),
});

export const albumIdParamsSchema = zod.object({
    albumId: zod.string().cuid2("Invalid album ID"),
});

export const deletePhotosSchema = zod.object({
    photoIds: zod.array(zod.string().cuid2("Invalid photo ID")).min(1, "photoIds must be a non-empty array"),
});

export const restorePhotosSchema = zod.object({
    photoIds: zod.array(zod.string().cuid2("Invalid photo ID")).min(1, "photoIds must be a non-empty array").optional(),
});