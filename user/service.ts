import db from "../config/prismaClient.ts";

export const createUser = async (name: string, email: string, password: string) => {
    return await db.user.create({
        data: {
            name,
            email,
            password
        }
    });
}
