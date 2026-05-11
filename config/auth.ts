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
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as AuthTokenPayload;

        req.user = decoded;

        next();
    } catch {
        res.status(401).send("Invalid token");
    }
}
