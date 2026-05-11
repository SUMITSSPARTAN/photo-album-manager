import express from "express";
import { createUser, loginUser, updateUser, deleteUser, getUserById, restoreUser } from "../../service/user/index.ts";
import { authMiddleware } from "../../config/auth.ts";
import { getAuthenticatedUserId, getErrorMessage } from "../utils.ts";
const router = express.Router();

router.post("/", async (req, res) => {
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

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await loginUser(email, password);
    res.send(`User logged in successfully. Token: ${user}`);
  } catch (error) {
    res.status(400).send(getErrorMessage(error, "Failed to log in user"));
  }
});

router.use(authMiddleware);

router.patch("/me", async (req, res) => {
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

router.delete("/me", async (req, res) => {
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

router.patch("/me/restore", async (req, res) => {
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

router.get("/me", async (req, res) => {
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
