import { Request, Response, NextFunction } from "express";

export const auth = async (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.user) {
        return res.status(404).send({ message: 'You need to login.' })
    }

    next();
}

export const adminRequire = async (req: Request, res: Response, next: NextFunction) => {
    const userSession: any = req.session.user;
    if (!(userSession.role == 'Admin')) {
        return res.status(403).send({ message: 'Your not authorized' })
    }

    next();
}