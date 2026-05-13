import zod from "zod";

const dateSchema = zod.union([zod.string().datetime(), zod.date()]);

export const createAlbumSchema = zod.object({
    albumName: zod.string().trim().min(1, "albumName is required"),
}).strict();

export const deleteAlbumsBodySchema = zod.object({
    albumIds: zod.array(zod.string().cuid("Invalid album ID")).min(1, "albumIds must be a non-empty array"),
}).strict();

export const restoreAlbumsBodySchema = zod.object({
    albumIds: zod.array(zod.string().cuid("Invalid album ID")).min(1, "albumIds must be a non-empty array").optional(),
}).strict();

export const albumDtoSchema = zod.object({
    id: zod.string().cuid(),
    name: zod.string().min(1),
    contentSize: zod.number().int().nonnegative(),
    createdAt: dateSchema,
    deletedAt: dateSchema.nullable(),
}).strict();

export const albumListResponseSchema = zod.object({
    albums: zod.array(albumDtoSchema),
}).strict();

export const deleteAlbumsResponseSchema = zod.object({
    message: zod.string().trim().min(1),
    deletedCount: zod.number().int().nonnegative(),
}).strict();

export type AlbumDto = zod.infer<typeof albumDtoSchema>;
