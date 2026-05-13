import type { NextFunction, Request, Response } from "express";
import type { ZodError, ZodTypeAny } from "zod";

export const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

export const sendErrorResponse = (
    res: Response,
    status: number,
    message: string,
    errors?: Record<string, string[]>,
) => res.status(status).json(errors ? { message, errors } : { message });

const getValidationErrorDetails = (error: ZodError) => {
    const { fieldErrors, formErrors } = error.flatten();
    const errors = Object.fromEntries(
        Object.entries(fieldErrors).filter(
            ([, messages]) => Array.isArray(messages) && messages.length > 0,
        ),
    ) as Record<string, string[]>;

    const message =
        formErrors[0] ??
        Object.values(errors).flat()[0] ??
        "Invalid request data";

    return { message, errors };
};

type ValidationTarget = "body" | "params" | "query";

export const validate =
    (schema: ZodTypeAny, target: ValidationTarget = "body") =>
        (req: Request, res: Response, next: NextFunction) => {
            const result = schema.safeParse(req[target]);
            if (!result.success) {
                const { message, errors } = getValidationErrorDetails(result.error);
                return sendErrorResponse(res, 400, message, errors);
            }
            req[target] = result.data as Request[typeof target];
            next();
        };
