import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Prisma } from "../../generated/prisma/client.ts";
import db from "../../config/prismaClient.ts";

type ServiceError = { ok: false; status: number; message: string };
export type ServiceResult<T> = { ok: true; data: T } | ServiceError;

type UserSummary = {
    id: string;
    name: string;
    email: string;
    createdAt: Date;
    deletedAt: Date | null;
};

type UserProfile = UserSummary & {
    photos: Array<{
        id: string;
        path: string;
        type: string;
        size: number;
        metadata: { encoding: string; originalName: string } | null;
        uploadedAt: Date;
        albumId: string | null;
    }>;
    albums: Array<{
        id: string;
        name: string;
        contentSize: number;
        createdAt: Date;
    }>;
};

const toPhotoMetadata = (value: Prisma.JsonValue): { encoding: string; originalName: string } | null => {
    if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        typeof value.encoding === "string" &&
        typeof value.originalName === "string"
    ) {
        return {
            encoding: value.encoding,
            originalName: value.originalName,
        };
    }

    return null;
};

const userCredentialsSelect = {
    id: true,
    name: true,
    email: true,
    password: true,
    deletedAt: true,
} satisfies Prisma.UserSelect;

const userSummarySelect = {
    id: true,
    name: true,
    email: true,
    createdAt: true,
    deletedAt: true,
} satisfies Prisma.UserSelect;

const userProfileSelect = {
    ...userSummarySelect,
    photos: {
        select: {
            id: true,
            path: true,
            type: true,
            size: true,
            metadata: true,
            uploadedAt: true,
            albumId: true,
        },
    },
    albums: {
        select: {
            id: true,
            name: true,
            contentSize: true,
            createdAt: true,
        },
    },
} satisfies Prisma.UserSelect;

const serviceError = (status: number, message: string): ServiceError => ({ ok: false, status, message });
const normalizeName = (name: string) => name.trim();
const normalizeEmail = (email: string) => email.trim().toLowerCase();

const isKnownPrismaError = (error: unknown): error is Prisma.PrismaClientKnownRequestError =>
    error instanceof Prisma.PrismaClientKnownRequestError;

const handleUserWriteError = (error: unknown, fallbackMessage: string): ServiceError => {
    if (isKnownPrismaError(error)) {
        if (error.code === "P2002") {
            return serviceError(409, "Email is already in use");
        }

        if (error.code === "P2025") {
            return serviceError(404, "User not found");
        }
    }

    console.error(fallbackMessage, error);
    return serviceError(500, fallbackMessage);
};

export const createUser = async (name: string, email: string, password: string): Promise<ServiceResult<UserSummary>> => {
    try {
        const normalizedName = normalizeName(name);
        const normalizedEmail = normalizeEmail(email);
        const existingUser = await getUserByEmail(normalizedEmail);

        if (existingUser) {
            return serviceError(409, "User already exists");
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await db.user.create({
            data: {
                name: normalizedName,
                email: normalizedEmail,
                password: hashedPassword,
            },
            select: userSummarySelect,
        });

        return { ok: true, data: user };
    } catch (error) {
        return handleUserWriteError(error, "Failed to create user");
    }
};

export const loginUser = async (email: string, password: string): Promise<ServiceResult<{ accessToken: string; refreshToken: string }>> => {
    try {
        const user = await getUserByEmail(normalizeEmail(email));

        if (!user) {
            return serviceError(401, "Invalid email or password");
        }

        if (user.deletedAt !== null) {
            return serviceError(403, "User account is deleted. Please restore your account to log in.");
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return serviceError(401, "Invalid email or password");
        }

        const accessToken = jwt.sign(
            {
                userId: user.id,
                email: user.email,
            },
            process.env.ACCESS_TOKEN_SECRET!,
            { expiresIn: "10m" },
        );

        const refreshToken = jwt.sign(
            {
                userId: user.id,
                email: user.email,
            },
            process.env.REFRESH_TOKEN_SECRET!,
            { expiresIn: "1d" },
        );

        return { ok: true, data: { accessToken, refreshToken } };
    } catch (error) {
        console.error("Failed to log in user", error);
        return serviceError(500, "Failed to log in user");
    }
};

export const getUserByEmail = async (email: string) => {
    return await db.user.findUnique({
        where: { email: normalizeEmail(email) },
        select: userCredentialsSelect,
    });
};

export const getUserById = async (id: string): Promise<ServiceResult<UserProfile>> => {
    try {
        const user = await db.user.findUnique({
            where: { id },
            select: userProfileSelect,
        });

        if (!user) {
            return serviceError(404, "User not found");
        }

        return {
            ok: true,
            data: {
                ...user,
                photos: user.photos.map((photo) => ({
                    ...photo,
                    metadata: toPhotoMetadata(photo.metadata),
                })),
            },
        };
    } catch (error) {
        console.error("Failed to fetch user", error);
        return serviceError(500, "Failed to fetch user");
    }
};

export const updateUser = async (id: string, name?: string, email?: string, password?: string): Promise<ServiceResult<UserSummary>> => {
    try {
        const data: { name?: string; email?: string; password?: string } = {};

        if (name !== undefined) data.name = normalizeName(name);
        if (email !== undefined) data.email = normalizeEmail(email);
        if (password !== undefined) data.password = await bcrypt.hash(password, 10);

        const user = await db.user.update({
            where: { id },
            data,
            select: userSummarySelect,
        });

        return { ok: true, data: user };
    } catch (error) {
        return handleUserWriteError(error, "Failed to update user");
    }
};

export const deleteUser = async (id: string): Promise<ServiceResult<UserSummary>> => {
    try {
        const user = await db.user.update({
            where: { id },
            data: {
                deletedAt: new Date(),
            },
            select: userSummarySelect,
        });

        return { ok: true, data: user };
    } catch (error) {
        return handleUserWriteError(error, "Failed to delete user");
    }
};

export const restoreUser = async (id: string): Promise<ServiceResult<UserSummary>> => {
    try {
        const user = await db.user.update({
            where: { id },
            data: {
                deletedAt: null,
            },
            select: userSummarySelect,
        });

        return { ok: true, data: user };
    } catch (error) {
        return handleUserWriteError(error, "Failed to restore user");
    }
};
