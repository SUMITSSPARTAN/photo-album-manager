import db from "../../config/prismaClient.ts";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { authMiddleware } from "../../config/auth.ts";

export const createUser = async (name: string, email: string, password: string) => {
    try {
        const existingUser = await getUserByEmail(email);

        if (existingUser) {
            throw new Error("User already exists");
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        return await db.user.create({
            data: {
                name,
                email,
                password: hashedPassword
            }
        });
    } catch (error) {
        console.error("Error creating user:", error);
        throw new Error("Failed to create user");
    }
}

export const loginUser = async (email: string, password: string) => {
    try {
        const user = await getUserByEmail(email);

        if (!user) {
            throw new Error("User not found");
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            throw new Error("Invalid password");
        }

        const token = jwt.sign(
            {
                userId: user.id
            },
            process.env.JWT_SECRET!,
            {
                expiresIn: '7d'
            }
        );

        return token;
    } catch (error) {
        console.error("Error logging in user:", error);
        throw new Error("Failed to log in user");
    }
};

export const getUserByEmail = async (email: string) => {
    return await db.user.findUnique({
        where: {
            email
        }
    });
}

export const getUserById = async (id: string) => {
    return await db.user.findUnique({
        where: {
            id
        }
    });
}

export const updateUser = async (id: string, name?: string, email?: string, password?: string) => {
    try {
        const existingUser = await getUserById(id);

        if (!existingUser) {
            throw new Error("User not found");
        }
        name = name || existingUser.name;
        email = email || existingUser.email;
        password = password ? await bcrypt.hash(password, 10) : undefined;
        return await db.user.update({
            where: {
                id
            },
            data: {
                name: name!,
                email: email!,
                password: password!
            }
        });
    } catch (error) {
        console.error("Error updating user:", error);
        throw new Error("Failed to update user");
    }
}

export const deleteUser = async (id: string) => {
    try {
        const existingUser = await getUserById(id);

        if (!existingUser) {
            throw new Error("User not found");
        }
        console.log("Deleting user:", existingUser.name);
        return await db.user.update({
            where: {
                id
            },
            data: {
                id: `D*${id}`
            }
        });
    } catch (error) {
        console.error("Error deleting user:", error);
        throw new Error("Failed to delete user");
    }
}

