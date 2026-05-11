import express from "express";
import { createPhotos, getPhotoById, deletePhotos, movePhotoToAnotherAlbum, restorePhotos, getPhotosByAlbumId, getDeletedPhotosByUserId } from "../../service/photo/index.ts";
import { upload } from "./util.ts";
import { getAuthenticatedUserId, getErrorMessage } from "../utils.ts";

const router = express.Router();

router.post("/", upload.array("photos"), async (req, res) => {
    try {
        const { albumId } = req.body;
        const userId = getAuthenticatedUserId(req);

        if (!userId) {
            res.status(401).send("Invalid authorization token");
            return;
        }

        if (!albumId) {
            res.status(400).send("Missing required field: albumId");
            return;
        }

        if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
            res.status(400).send("Photo files are required");
            return;
        }

        const photosData = (req.files as Express.Multer.File[]).map((file) => ({
            userId,
            albumId,
            path: file.path,
            type: file.mimetype,
            size: file.size,
            encoding: file.encoding,
            originalName: file.originalname,
        }));

        const payload = await createPhotos(photosData);
        res.status(201).json(payload);
    } catch (error) {
        res.status(400).send(getErrorMessage(error, "Failed to create photos"));
    }
});

router.get("/deleted", async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);

        if (!userId) {
            res.status(401).send("Invalid authorization token");
            return;
        }

        const photos = await getDeletedPhotosByUserId(userId);
        res.json(photos);
    } catch (error) {
        res.status(400).send(getErrorMessage(error, "Failed to retrieve deleted photos"));
    }
});

router.get("/album/:albumId", async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);

        if (!userId) {
            res.status(401).send("Invalid authorization token");
            return;
        }

        const photos = await getPhotosByAlbumId(userId, req.params.albumId);
        res.json(photos);
    } catch (error) {
        res.status(400).send(getErrorMessage(error, "Failed to retrieve photos"));
    }
});

router.get("/:id", async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);

        if (!userId) {
            res.status(401).send("Invalid authorization token");
            return;
        }

        const photo = await getPhotoById(userId, req.params.id);
        if (!photo) {
            res.status(404).send("Photo not found");
            return;
        }
        res.json(photo);
    } catch (error) {
        res.status(400).send(getErrorMessage(error, "Failed to retrieve photo"));
    }
});

router.delete("/", async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);
        const { photoIds } = req.body;

        if (!userId) {
            res.status(401).send("Invalid authorization token");
            return;
        }

        if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
            res.status(400).send("photoIds array is required");
            return;
        }

        await deletePhotos(userId, photoIds);

        res.status(204).send();
    } catch (error) {
        res.status(400).send(getErrorMessage(error, "Failed to delete photos"));
    }
});

router.patch("/restore", async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);
        const { photoIds } = req.body;

        if (!userId) {
            res.status(401).send("Invalid authorization token");
            return;
        }

        if (photoIds !== undefined && (!Array.isArray(photoIds) || photoIds.length === 0)) {
            res.status(400).send("photoIds must be a non-empty array when provided");
            return;
        }

        const restoredPhotos = await restorePhotos(userId, photoIds);
        res.json(restoredPhotos);
    } catch (error) {
        res.status(400).send(getErrorMessage(error, "Failed to restore photos"));
    }
});

router.patch("/:id/album", async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);
        const { albumId } = req.body;

        if (!userId) {
            res.status(401).send("Invalid authorization token");
            return;
        }

        if (!albumId) {
            res.status(400).send("Missing required field: albumId");
            return;
        }

        const payload = await movePhotoToAnotherAlbum(userId, req.params.id, albumId);
        res.json(payload);
    } catch (error) {
        res.status(400).send(getErrorMessage(error, "Failed to move photo"));
    }
});

export default router;
