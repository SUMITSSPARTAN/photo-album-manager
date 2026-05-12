import express from "express";
import { createUser, loginUser, updateUser, deleteUser, getUserById, restoreUser } from "../../service/user/index.ts";
import { authMiddleware, generateTokensFromRefreshToken } from "../../config/auth.ts";
import { getAuthenticatedUserId, getErrorMessage, validate } from "../utils.ts";
import { userSchema, loginSchema, updateUserSchema } from "./userSchema.ts";
const router = express.Router();
const refreshTokenCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 24 * 60 * 60 * 1000,
};

router.post("/", validate(userSchema), async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const user = await createUser(name, email, password);

    if (user) {
      res.send("User created successfully");
    }
  } catch (error) {
    res.status(400).send(getErrorMessage(error, "Failed to create user"));
  }
});

router.post("/login", validate(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await loginUser(email, password);
    res.cookie("refreshToken", user.refreshToken, refreshTokenCookieOptions);
    res.json({ accessToken: user.accessToken });
  } catch (error) {
    res.status(400).send(getErrorMessage(error, "Failed to log in user"));
  }
});

router.post("/refresh-token", (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    res.status(401).send("Refresh token is missing");
    return;
  }

  try {
    const tokens = generateTokensFromRefreshToken(refreshToken);

    res.cookie("refreshToken", tokens.refreshToken, refreshTokenCookieOptions);

    res.json({ accessToken: tokens.accessToken });
  } catch {
    res.status(401).send("Invalid refresh token");
  }
});

router.use(authMiddleware);

router.patch("/", validate(updateUserSchema), async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      res.status(401).send("Invalid authorization token");
      return;
    }

    await updateUser(userId, req.body.name, req.body.email, req.body.password);
    res.send("User updated successfully");
  } catch (error) {
    res.status(400).send(getErrorMessage(error, "Failed to update user"));
  }
});

router.delete("/", async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      res.status(401).send("Invalid authorization token");
      return;
    }

    await deleteUser(userId);
    res.send("User deleted successfully");
  } catch (error) {
    res.status(400).send(getErrorMessage(error, "Failed to delete user"));
  }
});

router.patch("/restore", async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      res.status(401).send("Invalid authorization token");
      return;
    }

    await restoreUser(userId);
    res.send("User restored successfully");
  } catch (error) {
    res.status(400).send(getErrorMessage(error, "Failed to restore user"));
  }
});

router.get("/", async (req, res) => {
  try {
    const userId = getAuthenticatedUserId(req);

    if (!userId) {
      res.status(401).send("Invalid authorization token");
      return;
    }

    const userProfile = await getUserById(userId);
    res.json(userProfile);
  } catch (error) {
    res.status(400).send(getErrorMessage(error, "Failed to fetch user profile"));
  }
});

export default router;
