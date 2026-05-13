import express from "express";
import { createUser, loginUser, updateUser, deleteUser, getUserById, restoreUser } from "../../service/user/index.ts";
import { authMiddleware, generateTokensFromRefreshToken, restoreAuthMiddleware } from "../../config/auth.ts";
import { getErrorMessage, sendErrorResponse, validate } from "../utils.ts";
import {
  userSchema,
  loginSchema,
  updateUserSchema,
  userProfileSchema,
  loginUserSchema,
  refreshTokenSchema,
  userMessageResponseSchema,
} from "./userSchema.ts";
import type { Request, Response } from "express";
const router = express.Router();
const getAuthenticatedUserId = (req: Request) => req.user?.userId ?? null;
const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 24 * 60 * 60 * 1000,
};

const requireAuthenticatedUserId = (req: Request, res: Response) => {
  const userId = getAuthenticatedUserId(req);

  if (!userId) {
    sendErrorResponse(res, 401, "Invalid authorization token");
    return null;
  }

  return userId;
};

router.post("/", validate(userSchema), async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const result = await createUser(name, email, password);

    if (!result.ok) {
      sendErrorResponse(res, result.status, result.message);
      return;
    }

    const response = userMessageResponseSchema.parse({
      message: "User created successfully",
      user: result.data,
    });
    res.status(201).json(response);
  } catch (error) {
    sendErrorResponse(res, 500, getErrorMessage(error, "Failed to create user"));
  }
});

router.post("/login", validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await loginUser(email, password);

    if (!result.ok) {
      sendErrorResponse(res, result.status, result.message);
      return;
    }

    res.cookie("refreshToken", result.data.refreshToken, refreshTokenCookieOptions);
    const response = loginUserSchema.parse({ accessToken: result.data.accessToken });
    res.json(response);
  } catch (error) {
    sendErrorResponse(res, 500, getErrorMessage(error, "Failed to log in user"));
  }
});

router.post("/refresh-token", async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    sendErrorResponse(res, 401, "Refresh token is missing");
    return;
  }

  try {
    const tokens = await generateTokensFromRefreshToken(refreshToken);

    res.cookie("refreshToken", tokens.refreshToken, refreshTokenCookieOptions);

    const response = refreshTokenSchema.parse({ accessToken: tokens.accessToken });
    res.json(response);
  } catch {
    sendErrorResponse(res, 401, "Invalid refresh token");
  }
});

router.patch("/restore", restoreAuthMiddleware, async (req, res) => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) return;

    const result = await restoreUser(userId);

    if (!result.ok) {
      sendErrorResponse(res, result.status, result.message);
      return;
    }

    const response = userMessageResponseSchema.parse({
      message: "User restored successfully",
      user: result.data,
    });
    res.json(response);
  } catch (error) {
    sendErrorResponse(res, 500, getErrorMessage(error, "Failed to restore user"));
  }
});

router.use(authMiddleware);

router.patch("/", validate(updateUserSchema), async (req, res) => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) return;

    const result = await updateUser(userId, req.body.name, req.body.email, req.body.password);

    if (!result.ok) {
      sendErrorResponse(res, result.status, result.message);
      return;
    }

    const response = userMessageResponseSchema.parse({
      message: "User updated successfully",
      user: result.data,
    });
    res.json(response);
  } catch (error) {
    sendErrorResponse(res, 500, getErrorMessage(error, "Failed to update user"));
  }
});

router.delete("/", async (req, res) => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) return;

    const result = await deleteUser(userId);

    if (!result.ok) {
      sendErrorResponse(res, result.status, result.message);
      return;
    }

    const response = userMessageResponseSchema.parse({
      message: "User deleted successfully",
      user: result.data,
    });
    res.json(response);
  } catch (error) {
    sendErrorResponse(res, 500, getErrorMessage(error, "Failed to delete user"));
  }
});

router.get("/", async (req, res) => {
  try {
    const userId = requireAuthenticatedUserId(req, res);
    if (!userId) return;

    const result = await getUserById(userId);

    if (!result.ok) {
      sendErrorResponse(res, result.status, result.message);
      return;
    }

    const response = userProfileSchema.parse(result.data);
    res.json(response);
  } catch (error) {
    sendErrorResponse(res, 500, getErrorMessage(error, "Failed to fetch user profile"));
  }
});

export default router;
