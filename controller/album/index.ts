import express from "express";
import { createAlbum } from "../../service/album/index.ts";
const router = express.Router();

router.post("/", async (req, res) => {
    try {
        const { userId, albumName } = req.body;

        if (!userId || !albumName) {
            return res.status(400).send("Missing required fields: userId and albumName");
        }

        const payload = await createAlbum(userId, albumName);
        res.status(201).json(payload);
    } catch (error) {
        let errorMessage = "Failed to create album";
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        res.status(400).send(errorMessage);
    }
});
export default router;