import zod from "zod";

const nameSchema = zod.string().trim().min(2).max(100);
const emailSchema = zod.string().trim().toLowerCase().email();
const passwordSchema = zod.string().min(6).max(72);

export const userSchema = zod.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
}).strict();

export const loginSchema = zod.object({
  email: emailSchema,
  password: passwordSchema,
}).strict();

export const updateUserSchema = zod.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  password: passwordSchema.optional(),
}).refine((data) => data.name || data.email || data.password, {
  message: "At least one field (name, email, or password) must be provided",
}).strict();

export const errorResponseSchema = zod.object({
  message: zod.string().trim().min(1),
  errors: zod.record(zod.string(), zod.array(zod.string().min(1))).optional(),
}).strict();

const dateSchema = zod.union([zod.string().datetime(), zod.date()]);

const photoMetadataSchema = zod.object({
  encoding: zod.string().min(1),
  originalName: zod.string().min(1),
});

export const photoSchema = zod.object({
  id: zod.string().cuid(),
  path: zod.string(),
  type: zod.string(),
  size: zod.number().int().nonnegative(),
  metadata: photoMetadataSchema.nullable(),
  uploadedAt: dateSchema,
  albumId: zod.string().cuid().nullable(),
});

export const albumSchema = zod.object({
  id: zod.string().cuid(),
  name: zod.string().min(1),
  contentSize: zod.number().int().nonnegative(),
  createdAt: dateSchema,
}).strict();

export const userSummarySchema = zod.object({
  id: zod.string().cuid(),
  name: nameSchema,
  email: emailSchema,
  createdAt: dateSchema,
  deletedAt: dateSchema.nullable(),
}).strict();

export const userProfileSchema = zod.object({
  ...userSummarySchema.shape,
  photos: zod.array(photoSchema),
  albums: zod.array(albumSchema),
}).strict();

export const loginUserSchema = zod.object({
  accessToken: zod.string(),
}).strict();

export const refreshTokenSchema = zod.object({
  accessToken: zod.string(),
}).strict();

export const messageResponseSchema = zod.object({
  message: zod.string().trim().min(1),
}).strict();

export const userMessageResponseSchema = messageResponseSchema.extend({
  user: userSummarySchema,
}).strict();

export const updateUserDtoSchema = zod.object({
  name: nameSchema.optional(),
  email: emailSchema.optional(),
  password: passwordSchema.optional(),
}).refine((data) => data.name || data.email || data.password, {
  message: "At least one field (name, email, or password) must be provided",
}).strict();

export type LoginUserDto = zod.infer<typeof loginUserSchema>;
export type UpdateUserDto = zod.infer<typeof updateUserDtoSchema>;
export type UserProfileDto = zod.infer<typeof userProfileSchema>;
export type UserSummaryDto = zod.infer<typeof userSummarySchema>;
