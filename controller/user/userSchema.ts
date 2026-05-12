import zod from "zod";

export const userSchema = zod.object({
  name: zod.string().min(2).max(100),
  email: zod.string().email(),
  password: zod.string().min(6),
});

export const loginSchema = zod.object({
  email: zod.string().email(),
  password: zod.string().min(6),
});

export const updateUserSchema = zod.object({
  name: zod.string().min(2).max(100).optional(),
  email: zod.string().email().optional(),
  password: zod.string().min(6).optional(),
}).refine((data) => data.name || data.email || data.password, {
  message: "At least one field (name, email, or password) must be provided",  
});