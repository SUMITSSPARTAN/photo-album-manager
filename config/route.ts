import userRouter from '../controller/user/index.ts';
import photoRouter from '../controller/photo/index.ts';
import albumRouter from '../controller/album/index.ts';
import express from 'express';
import { authMiddleware } from './auth.ts';

export default function route(app: any) {
    app.get("/", (req: any, res: any) => {
        res.send("Server is running!");
    });

    app.use(express.json());
    app.use("/users", userRouter);
    app.use("/photos", authMiddleware, photoRouter);
    app.use("/albums", authMiddleware, albumRouter);
}
