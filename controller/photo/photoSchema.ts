import zod from "zod";

const dateSchema = zod.union([zod.string().datetime(), zod.date()]);

export const createPhotoSchema = zod.object({
    albumId: zod.string().cuid("Invalid album ID"),
}).strict();

export const photoIdParamsSchema = zod.object({
    id: zod.string().cuid("Invalid photo ID"),
}).strict();

export const albumIdParamsSchema = zod.object({
    albumId: zod.string().cuid("Invalid album ID"),
}).strict();

export const deletePhotosSchema = zod.object({
    photoIds: zod.array(zod.string().cuid("Invalid photo ID")).min(1, "photoIds must be a non-empty array"),
}).strict();

export const restorePhotosSchema = zod.object({
    photoIds: zod.array(zod.string().cuid("Invalid photo ID")).min(1, "photoIds must be a non-empty array").optional(),
}).strict();

export const photoMetadataSchema = zod.object({
    encoding: zod.string().min(1),
    originalName: zod.string().min(1),
}).strict();

export const photoResponseSchema = zod.object({
    id: zod.string().cuid(),
    path: zod.string().min(1),
    type: zod.string().min(1),
    size: zod.number().int().nonnegative(),
    metadata: photoMetadataSchema,
    uploadedAt: dateSchema,
    albumId: zod.string().cuid(),
    deletedAt: dateSchema.nullable(),
}).strict();

export const photoItemResponseSchema = zod.object({
    photo: photoResponseSchema,
}).strict();

export const photoListResponseSchema = zod.object({
    photos: zod.array(photoResponseSchema),
}).strict();

export const deletePhotosResponseSchema = zod.object({
    message: zod.string().trim().min(1),
    deletedCount: zod.number().int().nonnegative(),
}).strict();
