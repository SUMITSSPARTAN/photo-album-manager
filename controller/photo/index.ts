import express from "express";
import { createPhoto, createPhotos, getPhotoById, deletePhoto, deletePhotos, movePhotoToAnotherAlbum, restorePhoto, restorePhotos, getPhotosByAlbumId, getDeletedPhotosByUserId } from "../../service/photo/index.ts";
import { upload } from "./util.ts";
import { getAuthenticatedUserId, getErrorMessage } from "../utils.ts";

const router = express.Router();

router.post("/", upload.single("photo"), async (req, res) => {
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

        if (!req.file) {
            res.status(400).send("Photo file is required");
            return;
        }

        console.log("Received file:", req.file);

        const payload = await createPhoto({
            userId,
            albumId,
            path: req.file.path,
            type: req.file.mimetype,
            size: req.file.size,
            encoding: req.file.encoding,
            originalName: req.file.originalname,
        });

        res.status(201).json(payload);
    } catch (error) {
        res.status(400).send(getErrorMessage(error, "Failed to create photo"));
    }
});

router.post("/batch", upload.array("photos"), async (req, res) => {
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

        const createdPhotos = await createPhotos(photosData);
        res.status(201).json(createdPhotos);
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

router.delete("/:id", async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);

        if (!userId) {
            res.status(401).send("Invalid authorization token");
            return;
        }

        await deletePhoto(userId, req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(400).send(getErrorMessage(error, "Failed to delete photo"));
    }
});

router.patch("/restore", async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);

        if (!userId) {
            res.status(401).send("Invalid authorization token");
            return;
        }

        const restoredPhotos = await restorePhotos(userId);
        res.json(restoredPhotos);
    } catch (error) {
        res.status(400).send(getErrorMessage(error, "Failed to restore photos"));
    }
});

router.patch("/:id/restore", async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);

        if (!userId) {
            res.status(401).send("Invalid authorization token");
            return;
        }

        const restoredPhoto = await restorePhoto(userId, req.params.id);
        res.json(restoredPhoto);
    } catch (error) {
        res.status(400).send(getErrorMessage(error, "Failed to restore photo"));
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
