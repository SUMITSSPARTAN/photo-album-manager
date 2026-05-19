import express from "express";
import type { Request } from "express";
import { createPhotos, deletePhotos, getDeletedPhotosByUserId, getPhotosByAlbumId, getPhotosByUserId, movePhotoToAnotherAlbum, restorePhotos } from "../../service/photo/index.ts";
import { getErrorMessage, sendErrorResponse, validate } from "../utils.ts";
import { upload } from "./util.ts";
import { albumIdParamsSchema, createPhotoSchema, deletePhotosResponseSchema, deletePhotosSchema, photoIdParamsSchema, photoItemResponseSchema, photoListResponseSchema, restorePhotosSchema } from "./photoSchema.ts";

const router = express.Router();
const getAuthenticatedUserId = (req: Request) => req.user?.userId ?? null;

router.post("/", upload.array("photos"), validate(createPhotoSchema), async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req)!;

        if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
            sendErrorResponse(res, 400, "Photo files are required");
            return;
        }

        const { albumId } = req.body;
        const result = await createPhotos(
            req.files.map((file) => ({
                userId,
                albumId,
                path: file.path,
                type: file.mimetype,
                size: file.size,
                encoding: file.encoding,
                originalName: file.originalname,
            })),
        );

        if (!result.ok) {
            sendErrorResponse(res, result.status, result.message);
            return;
        }

        res.status(201).json(photoListResponseSchema.parse({ photos: result.data }));
    } catch (error) {
        sendErrorResponse(res, 500, getErrorMessage(error, "Failed to create photos"));
    }
});

router.get("/deleted", async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req)!;

        const result = await getDeletedPhotosByUserId(userId);
        if (!result.ok) {
            sendErrorResponse(res, result.status, result.message);
            return;
        }

        res.json(photoListResponseSchema.parse({ photos: result.data }));
    } catch (error) {
        sendErrorResponse(res, 500, getErrorMessage(error, "Failed to retrieve deleted photos"));
    }
});

router.get("/album/:albumId", validate(albumIdParamsSchema, "params"), async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req)!;

        const { albumId } = req.params as { albumId: string };
        const result = await getPhotosByAlbumId(userId, albumId);
        if (!result.ok) {
            sendErrorResponse(res, result.status, result.message);
            return;
        }

        res.json(photoListResponseSchema.parse({ photos: result.data }));
    } catch (error) {
        sendErrorResponse(res, 500, getErrorMessage(error, "Failed to retrieve photos"));
    }
});

router.get("/", async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req)!;

        const result = await getPhotosByUserId(userId);
        if (!result.ok) {
            sendErrorResponse(res, result.status, result.message);
            return;
        }

        res.json(photoListResponseSchema.parse({ photos: result.data }));
    } catch (error) {
        sendErrorResponse(res, 500, getErrorMessage(error, "Failed to retrieve photos"));
    }
});

router.delete("/", validate(deletePhotosSchema), async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req)!;

        const { photoIds } = req.body;
        const result = await deletePhotos(userId, photoIds);
        if (!result.ok) {
            sendErrorResponse(res, result.status, result.message);
            return;
        }

        res.json(deletePhotosResponseSchema.parse({
            message: "Photos deleted successfully",
            deletedCount: result.data.deletedCount,
        }));
    } catch (error) {
        sendErrorResponse(res, 500, getErrorMessage(error, "Failed to delete photos"));
    }
});

router.patch("/restore", validate(restorePhotosSchema), async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req)!;

        const { photoIds } = req.body;
        const result = await restorePhotos(userId, photoIds);
        if (!result.ok) {
            sendErrorResponse(res, result.status, result.message);
            return;
        }

        res.json(photoListResponseSchema.parse({ photos: result.data }));
    } catch (error) {
        sendErrorResponse(res, 500, getErrorMessage(error, "Failed to restore photos"));
    }
});

router.patch("/:id/album", validate(photoIdParamsSchema, "params"), validate(createPhotoSchema), async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req)!;

        const { id } = req.params as { id: string };
        const { albumId } = req.body;
        const result = await movePhotoToAnotherAlbum(userId, id, albumId);
        if (!result.ok) {
            sendErrorResponse(res, result.status, result.message);
            return;
        }

        res.json(photoItemResponseSchema.parse({ photo: result.data }));
    } catch (error) {
        sendErrorResponse(res, 500, getErrorMessage(error, "Failed to move photo"));
    }
});

export default router;
