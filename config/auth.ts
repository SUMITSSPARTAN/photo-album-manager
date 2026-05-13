import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import db from "./prismaClient.ts";
import { sendErrorResponse } from "../controller/utils.ts";

type AuthTokenPayload = {
    userId: string;
    email: string;
    iat?: number;
    exp?: number;
};

type RefreshTokenPayload = {
    userId: string;
    email: string;
    iat?: number;
    exp?: number;
};

type AuthOptions = {
    allowDeletedUser?: boolean;
    allowRefreshToken?: boolean;
};

const getUserAuthState = async (userId: string) =>
    db.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            email: true,
            deletedAt: true,
        },
    });

const getAuthenticatedUser = async (
    payload: AuthTokenPayload | RefreshTokenPayload,
    { allowDeletedUser = false }: AuthOptions = {},
) => {
    const user = await getUserAuthState(payload.userId);

    if (!user || (!allowDeletedUser && user.deletedAt !== null)) {
        return null;
    }

    return {
        userId: user.id,
        email: user.email,
        ...(payload.iat !== undefined ? { iat: payload.iat } : {}),
        ...(payload.exp !== undefined ? { exp: payload.exp } : {}),
    };
};

const authenticateFromAccessToken = async (req: Request, options: AuthOptions) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return null;
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
        return null;
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as AuthTokenPayload;
    return getAuthenticatedUser(decoded, options);
};

const authenticateFromRefreshToken = async (req: Request, options: AuthOptions) => {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
        return null;
    }

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!) as RefreshTokenPayload;
    return getAuthenticatedUser(decoded, options);
};

const createAuthMiddleware =
    (options: AuthOptions = {}) =>
        async (req: Request, res: Response, next: NextFunction) => {
            try {
                const authenticatedUser =
                    await authenticateFromAccessToken(req, options) ??
                    (options.allowRefreshToken ? await authenticateFromRefreshToken(req, options) : null);

                if (!authenticatedUser) {
                    return sendErrorResponse(res, 401, "Invalid authorization token");
                }

                req.user = authenticatedUser;
                return next();
            } catch {
                return sendErrorResponse(res, 401, "Invalid authorization token");
            }
        };

export const authMiddleware = createAuthMiddleware();
export const restoreAuthMiddleware = createAuthMiddleware({
    allowDeletedUser: true,
    allowRefreshToken: true,
});

export async function generateTokensFromRefreshToken(refreshToken: string) {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!) as RefreshTokenPayload;
    const user = await getAuthenticatedUser(decoded);

    if (!user) {
        throw new Error("Invalid refresh token");
    }

    const accessToken = jwt.sign(
        {
            userId: user.userId,
            email: user.email,
        },
        process.env.ACCESS_TOKEN_SECRET!,
        { expiresIn: "10m" },
    );

    const newRefreshToken = jwt.sign(
        {
            userId: user.userId,
            email: user.email,
        },
        process.env.REFRESH_TOKEN_SECRET!,
        { expiresIn: "1d" },
    );

    return { accessToken, refreshToken: newRefreshToken };
}
