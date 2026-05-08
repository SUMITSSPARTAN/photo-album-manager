import userRouter from '../user/controller.ts';
import photoRouter from '../photo/controller.ts';
import albumRouter from '../album/controller.ts';
import express from 'express';
import { authMiddleware } from './auth.ts';

export default function route(app: any) {
    app.get("/", (req: any, res: any) => {
        res.send("Server is running!");
    });

    app.use(express.json());
    //app.use(authMiddleware);
    app.use("/users", userRouter);
    app.use("/photos", authMiddleware, photoRouter);
    app.use("/albums", authMiddleware, albumRouter);
}
