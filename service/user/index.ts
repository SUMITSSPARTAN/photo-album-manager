import db from "../../config/prismaClient.ts";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

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
        }else if (user.deletedAt !== null) {
            return "User account is deleted. Please restore your account to log in.";
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
        },
        select: {
            id: true,
            name: true,
            email: true,
            password: true,
            deletedAt: true
        }
    });
}

export const getUserById = async (id: string) => {
    return await db.user.findUnique({
        where: {
            id
        },
        select: {
            id: true,
            name: true,
            email: true,
            photos: true,
            albums: true
        }
    });
}

export const updateUser = async (id: string, name?: string, email?: string, password?: string) => {
    try {
        const data: { name?: string; email?: string; password?: string } = {};

        if (name !== undefined) data.name = name;
        if (email !== undefined) data.email = email;
        if (password !== undefined) data.password = await bcrypt.hash(password, 10);

        return await db.user.update({
            where: { id },
            data,
        });
    } catch (error) {
        console.error("Error updating user:", error);
        throw new Error("Failed to update user");
    }
};


export const deleteUser = async (id: string) => {
    try {
        return await db.user.update({
            where: {
                id
            },
            data: {
                deletedAt: new Date(),
            }
        });
    } catch (error) {
        console.error("Error deleting user:", error);
        throw new Error("Failed to delete user");
    }
}

export const restoreUser = async (id: string) => {
    try {
        return await db.user.update({
            where: {
                id: id
            },
            data: {
                deletedAt: null,
            }
        });
    } catch (error) {
        console.error("Error restoring user:", error);
        throw new Error("Failed to restore user");
    }
}   
