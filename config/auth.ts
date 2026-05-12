import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

type AuthTokenPayload = {
    userId: string;
    email: string;
    iat?: number;
    exp?: number;
};

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).send("No token");
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
        return res.status(401).send("Invalid token");
    }

    try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as AuthTokenPayload;

        req.user = decoded;

        next();
    } catch {
        res.status(401).send("Invalid token");
    }
}

type RefreshTokenPayload = {
    userId: string;
    email: string;
    iat?: number;
    exp?: number;
};

export function generateTokensFromRefreshToken(refreshToken: string) {
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!) as RefreshTokenPayload;

    const accessToken = jwt.sign(
        {
            userId: decoded.userId,
            email: decoded.email
        },
        process.env.ACCESS_TOKEN_SECRET!,
        { expiresIn: '10m' }
    );

    const newRefreshToken = jwt.sign(
        {
            userId: decoded.userId,
            email: decoded.email
        },
        process.env.REFRESH_TOKEN_SECRET!,
        { expiresIn: '1d' }
    );

    return { accessToken, refreshToken: newRefreshToken };
}
