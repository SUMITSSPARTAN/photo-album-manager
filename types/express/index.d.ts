export {};

declare global {
    namespace Express {
        interface UserPayload {
            userId: string;
            email: string;
            iat?: number;
            exp?: number;
        }

        interface Request {
            user?: UserPayload;
        }
    }
}
