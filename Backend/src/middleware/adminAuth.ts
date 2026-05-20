import { Request, Response, NextFunction } from "express";

export const adminAuth = (req: Request, res: Response, next: NextFunction) => {
    const user: any = req.user;

    if (!user || user.role !== "SuperAdmin") {
        return res.status(401).json({ message: "Unauthorized." });
    }

    next();
};