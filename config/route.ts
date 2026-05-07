import userRouter from '../user/controller.ts';
import photoRouter from '../photo/controller.ts';
import albumRouter from '../album/controller.ts';

export default function route(app: any) {
    app.get("/", (req: any, res: any) => {
        res.send("Server is running!");
    });

    app.use("/users", userRouter);
    app.use("/photos", photoRouter);
    app.use("/albums", albumRouter);
}
