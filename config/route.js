import userRouter from './../user/controller.js';
import photoRouter from './../photo/controller.js';
import albumRouter from './../album/controller.js';

export default function route(app) {
    app.get("/", (req, res) => {
        res.send("Server is running!");
    });

    app.use("/users", userRouter);
    app.use("/photos", photoRouter);
    app.use("/albums", albumRouter);
}