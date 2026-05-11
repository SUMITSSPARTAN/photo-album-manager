import type { Request } from "express";

export const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

export const getAuthenticatedUserId = (req: Request) => req.user?.userId ?? null;
