import express from "express";
import { createPhoto, createPhotos, getPhotoById, deletePhoto, deletePhotos, movePhotoToAnotherAlbum } from "../../service/photo/index.ts";
import { upload } from "./util.ts";

const router = express.Router();

const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

router.post("/", upload.single("photo"), async (req, res) => {
    try {
        const { albumId } = req.body;
        const userId = req.user?.userId;

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
        const userId = req.user?.userId;

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

router.get("/:id", async (req, res) => {
    try {
        const photo = await getPhotoById(req.params.id);
        if (!photo) {
            res.status(404).send("Photo not found");
            return;
        }
        res.json(photo);
    } catch (error) {
        res.status(400).send(getErrorMessage(error, "Failed to retrieve photo"));
    }
}); 

router.delete("/batch", async (req, res) => {
    try {
        const { photoIds } = req.body;

        if (!photoIds || !Array.isArray(photoIds) || photoIds.length === 0) {
            res.status(400).send("photoIds array is required");
            return;
        }

        await deletePhotos(photoIds);

        res.status(204).send();
    } catch (error) {
        res.status(400).send(getErrorMessage(error, "Failed to delete photos"));
    }
});

router.delete("/:id", async (req, res) => {
    try {
        await deletePhoto(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(400).send(getErrorMessage(error, "Failed to delete photo"));
    }
});

router.put("/:id/move", async (req, res) => {
    try {
        await movePhotoToAnotherAlbum(req.params.id, req.body.newAlbumId);
        res.status(200).send();
    } catch (error) {
        res.status(400).send(getErrorMessage(error, "Failed to move photo"));
    }
});

export default router;
