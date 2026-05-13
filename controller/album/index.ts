import express from "express";
import type { Request } from "express";
import { createAlbum, deleteAlbums, getAlbumsByUserId, getDeletedAlbumsByUserId, restoreAlbums } from "../../service/album/index.ts";
import { getErrorMessage, sendErrorResponse, validate } from "../utils.ts";
import { albumListResponseSchema, createAlbumSchema, deleteAlbumsBodySchema, deleteAlbumsResponseSchema, restoreAlbumsBodySchema } from "./albumSchema.ts";

const router = express.Router();
const getAuthenticatedUserId = (req: Request) => req.user?.userId ?? null;

router.post("/", validate(createAlbumSchema), async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req)!;
        const { albumName } = req.body;
        const result = await createAlbum(userId, albumName);

        if (!result.ok) {
            sendErrorResponse(res, result.status, result.message);
            return;
        }

        res.status(201).json(albumListResponseSchema.parse({ albums: [result.data] }));
    } catch (error) {
        sendErrorResponse(res, 500, getErrorMessage(error, "Failed to create album"));
    }
});

router.get("/", async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req)!;
        const result = await getAlbumsByUserId(userId);

        if (!result.ok) {
            sendErrorResponse(res, result.status, result.message);
            return;
        }

        res.status(200).json(albumListResponseSchema.parse({ albums: result.data }));
    } catch (error) {
        sendErrorResponse(res, 500, getErrorMessage(error, "Failed to fetch albums"));
    }
});

router.get("/deleted", async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req)!;
        const result = await getDeletedAlbumsByUserId(userId);

        if (!result.ok) {
            sendErrorResponse(res, result.status, result.message);
            return;
        }

        res.status(200).json(albumListResponseSchema.parse({ albums: result.data }));
    } catch (error) {
        sendErrorResponse(res, 500, getErrorMessage(error, "Failed to fetch deleted albums"));
    }
});

router.delete("/", validate(deleteAlbumsBodySchema), async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req)!;
        const { albumIds } = req.body;
        const result = await deleteAlbums(userId, albumIds);

        if (!result.ok) {
            sendErrorResponse(res, result.status, result.message);
            return;
        }

        res.status(200).json(deleteAlbumsResponseSchema.parse({
            message: "Albums deleted successfully",
            deletedCount: result.data.deletedCount,
        }));
    } catch (error) {
        sendErrorResponse(res, 500, getErrorMessage(error, "Failed to delete albums"));
    }
});

router.patch("/restore", validate(restoreAlbumsBodySchema), async (req, res) => {
    try {
        const userId = getAuthenticatedUserId(req)!;
        const { albumIds } = req.body;
        const result = await restoreAlbums(userId, albumIds);

        if (!result.ok) {
            sendErrorResponse(res, result.status, result.message);
            return;
        }

        res.status(200).json(albumListResponseSchema.parse({ albums: result.data }));
    } catch (error) {
        sendErrorResponse(res, 500, getErrorMessage(error, "Failed to restore albums"));
    }
});

export default router;
