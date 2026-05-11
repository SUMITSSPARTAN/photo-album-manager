import express from "express";
import { createUser, loginUser, updateUser, deleteUser } from "../../service/user/index.ts";
import { authMiddleware } from "../../config/auth.ts";
const router = express.Router();

const getRouteParam = (value: string | string[] | undefined) =>
  typeof value === "string" ? value : undefined;

router.post("/", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const user = await createUser(name, email, password);

    if (user) {
      res.send("User created successfully");
    }
  } catch (error) {
    let errorMessage = "Failed to create user";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    res.status(400).send(errorMessage);
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await loginUser(email, password);
    res.send(`User logged in successfully. Token: ${user}`);
  } catch (error) {
    let errorMessage = "Failed to log in user";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    res.status(400).send(errorMessage);
  }
});

router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const userId = getRouteParam(req.params.id);

    if (!userId) {
      res.status(400).send("Invalid user id");
      return;
    }

    await updateUser(userId, req.body.name, req.body.email, req.body.password);
    res.send("User updated successfully");
  } catch (error) {
    let errorMessage = "Failed to update user";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    res.status(400).send(errorMessage);
  }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const userId = getRouteParam(req.params.id);

    if (!userId) {
      res.status(400).send("Invalid user id");
      return;
    }

    await deleteUser(userId);
    res.send("User deleted successfully");
  } catch (error) {
    let errorMessage = "Failed to delete user";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    res.status(400).send(errorMessage);
  }
});

export default router;
