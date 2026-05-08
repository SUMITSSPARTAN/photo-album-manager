import jwt from 'jsonwebtoken';

export function authMiddleware(req: any, res: any, next: any) {

    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).send('No token');
    }

    const token = authHeader.split(' ')[1];

    try {

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET!
        );

        req.user = decoded;

        next();

    } catch {
        res.status(401).send('Invalid token');
    }
}