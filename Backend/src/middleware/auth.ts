import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "hessabi_jwt_secret_key_2024";

declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

export const auth = async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(404).send({ message: 'You need to login.' })
    }

    const token = authHeader.split(" ")[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch {
        return res.status(401).send({ message: 'Invalid or expired token.' })
    }
}

export const adminRequire = async (req: Request, res: Response, next: NextFunction) => {
    if (req.user?.role !== 'Admin') {
        return res.status(403).send({ message: 'Your not authorized' })
    }
    next();
}
