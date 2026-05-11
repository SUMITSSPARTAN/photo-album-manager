import express from "express";
import { createAlbum, getAlbumsByUserId, deleteAlbum, deleteAlbums, getDeletedAlbumsByUserId, restoreAlbum, restoreSelectedAlbums } from "../../service/album/index.ts";
import { getAuthenticatedUserId, getErrorMessage } from "../utils.ts";
const router = express.Router();

router.post("/", async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);
        const { albumName } = req.body;

        if (!userId) {
            return res.status(401).send("Invalid authorization token");
        }

        if (!albumName) {
            return res.status(400).send("Missing required field: albumName");
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

router.delete("/", async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);
        const { albumIds } = req.body;

        if (!userId) {
            return res.status(401).send("Invalid authorization token");
        }

        if (!albumIds || !Array.isArray(albumIds) || albumIds.length === 0) {
            return res.status(400).send("Missing or invalid required field: albumIds");
        }

        const payload = await deleteAlbums(userId, albumIds);
        res.status(200).json(payload);
    } catch (error) {
        res.status(400).send(getErrorMessage(error, "Failed to delete albums"));
    }
});

router.patch("/restore", async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);
        const { albumIds } = req.body;

        if (!userId) {
            return res.status(401).send("Invalid authorization token");
        }

        if (!albumIds || !Array.isArray(albumIds) || albumIds.length === 0) {
            return res.status(400).send("Missing or invalid required field: albumIds");
        }

        const payload = await restoreSelectedAlbums(userId, albumIds);
        res.status(200).json(payload);
    } catch (error) {
        res.status(400).send(getErrorMessage(error, "Failed to restore albums"));
    }
});

router.delete("/:albumId", async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);
        const { albumId } = req.params;

        if (!userId) {
            return res.status(401).send("Invalid authorization token");
        }

        if (!albumId) {
            return res.status(400).send("Missing required field: albumId");
        }

        const payload = await deleteAlbum(userId, albumId);
        res.status(200).json(payload);
    } catch (error) {
        res.status(400).send(getErrorMessage(error, "Failed to delete album"));
    }
});

router.patch("/:albumId/restore", async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);
        const { albumId } = req.params;

        if (!userId) {
            return res.status(401).send("Invalid authorization token");
        }

        if (!albumId) {
            return res.status(400).send("Missing required field: albumId");
        }

        const payload = await restoreAlbum(userId, albumId);
        res.status(200).json(payload);
    } catch (error) {
        res.status(400).send(getErrorMessage(error, "Failed to restore album"));
    }
});

export default router;
