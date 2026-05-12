import type { NextFunction, Request, Response } from "express";
import type { ZodTypeAny } from "zod";

export const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

export const getAuthenticatedUserId = (req: Request) => req.user?.userId ?? null;

type ValidationTarget = "body" | "params" | "query";

export const validate =
    (schema: ZodTypeAny, target: ValidationTarget = "body") =>
        (req: Request, res: Response, next: NextFunction) => {
            const result = schema.safeParse(req[target]);
            if (!result.success) {
                return res.status(400).json(result.error.format());
            }
            req[target] = result.data as Request[typeof target];
            next();
        };
