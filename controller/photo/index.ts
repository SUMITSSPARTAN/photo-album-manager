import express from "express";
import { createPhotos, getPhotoById, deletePhotos, movePhotoToAnotherAlbum, restorePhotos, getPhotosByAlbumId, getDeletedPhotosByUserId } from "../../service/photo/index.ts";
import { upload } from "./util.ts";
import { getAuthenticatedUserId, getErrorMessage, validate } from "../utils.ts";
import { albumIdParamsSchema, createPhotoSchema, deletePhotosSchema, getPhotoByIdParamsSchema, restorePhotosSchema } from "./photoSchema.ts";

const router = express.Router();

router.post("/", upload.array("photos"), validate(createPhotoSchema), async (req, res) => {
    try {
        const { albumId } = req.body;
        const userId = getAuthenticatedUserId(req);

        if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
            res.status(400).send("Photo files are required");
            return;
        }

        const photosData = (req.files as Express.Multer.File[]).map((file) => ({
            userId: userId!,
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

router.get("/album/:albumId", validate(albumIdParamsSchema, "params"), async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);

        if (!userId) {
            res.status(401).send("Invalid authorization token");
            return;
        }

        const { albumId } = req.params as { albumId: string };
        const photos = await getPhotosByAlbumId(userId, albumId);
        res.json(photos);
    } catch (error) {
        res.status(400).send(getErrorMessage(error, "Failed to retrieve photos"));
    }
});

router.get("/:id", validate(getPhotoByIdParamsSchema, "params"), async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);

        if (!userId) {
            res.status(401).send("Invalid authorization token");
            return;
        }

        const { id } = req.params as { id: string };
        const photo = await getPhotoById(userId, id);
        if (!photo) {
            res.status(404).send("Photo not found");
            return;
        }
        res.json(photo);
    } catch (error) {
        res.status(400).send(getErrorMessage(error, "Failed to retrieve photo"));
    }
});

router.delete("/", validate(deletePhotosSchema), async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);
        const { photoIds } = req.body;

        if (!userId) {
            res.status(401).send("Invalid authorization token");
            return;
        }

        await deletePhotos(userId, photoIds);

        res.status(204).send();
    } catch (error) {
        res.status(400).send(getErrorMessage(error, "Failed to delete photos"));
    }
});

router.patch("/restore", validate(restorePhotosSchema), async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);
        const { photoIds } = req.body;

        if (!userId) {
            res.status(401).send("Invalid authorization token");
            return;
        }

        const restoredPhotos = await restorePhotos(userId, photoIds);
        res.json(restoredPhotos);
    } catch (error) {
        res.status(400).send(getErrorMessage(error, "Failed to restore photos"));
    }
});

router.patch("/:id/album", validate(getPhotoByIdParamsSchema, "params"), validate(createPhotoSchema), async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req);
        const { albumId } = req.body;

        if (!userId) {
            res.status(401).send("Invalid authorization token");
            return;
        }

        const { id } = req.params as { id: string };
        const payload = await movePhotoToAnotherAlbum(userId, id, albumId);
        res.json(payload);
    } catch (error) {
        res.status(400).send(getErrorMessage(error, "Failed to move photo"));
    }
});

export default router;
