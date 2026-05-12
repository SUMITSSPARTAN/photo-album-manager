import express from "express";
import { createAlbum, getAlbumsByUserId, deleteAlbums, getDeletedAlbumsByUserId, restoreAlbums } from "../../service/album/index.ts";
import { getAuthenticatedUserId, getErrorMessage, validate } from "../utils.ts";
import { createAlbumSchema, deleteAlbumsBodySchema, restoreAlbumsBodySchema } from "./albumSchema.ts";
const router = express.Router();

router.post("/", validate(createAlbumSchema), async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);
        const { albumName } = req.body;

        if (!userId) {
            return res.status(401).send("Invalid authorization token");
        }

        const payload = await createAlbum(userId, albumName);
        res.status(201).json(payload);
    } catch (error) {
        res.status(400).send(getErrorMessage(error, "Failed to create album"));
    }
});

router.get("/", async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);

        if (!userId) {
            return res.status(401).send("Invalid authorization token");
        }

        const payload = await getAlbumsByUserId(userId);
        res.status(200).json(payload);
    } catch (error) {
        res.status(400).send(getErrorMessage(error, "Failed to fetch albums"));
    }
});

router.get("/deleted", async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);

        if (!userId) {
            return res.status(401).send("Invalid authorization token");
        }

        const payload = await getDeletedAlbumsByUserId(userId);
        res.status(200).json(payload);
    } catch (error) {
        res.status(400).send(getErrorMessage(error, "Failed to fetch deleted albums"));
    }
});

router.delete("/", validate(deleteAlbumsBodySchema), async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);
        const { albumIds } = req.body;

        if (!userId) {
            return res.status(401).send("Invalid authorization token");
        }

        const payload = await deleteAlbums(userId, albumIds);
        res.status(200).json(payload);
    } catch (error) {
        res.status(400).send(getErrorMessage(error, "Failed to delete albums"));
    }
});

router.patch("/restore", validate(restoreAlbumsBodySchema), async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);
        const { albumIds } = req.body;

        if (!userId) {
            return res.status(401).send("Invalid authorization token");
        }

        const payload = await restoreAlbums(userId, albumIds);
        res.status(200).json(payload);
    } catch (error) {
        res.status(400).send(getErrorMessage(error, "Failed to restore albums"));
    }
});

export default router;
