import jwt from "jsonwebtoken";
import { Request, Response, NextFunction } from "express";

export const adminJwtAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided." });
  }

  const token = authHeader.split(" ")[1];
  try {
    const JWT_SECRET = process.env.JWT_SECRET || "hessabi_jwt_secret_key_2026";
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token." });
  }
};

export const adminAuth = (req: Request, res: Response, next: NextFunction) => {
  const user: any = req.user;
  if (!user || user.role !== "SuperAdmin") {
    return res.status(401).json({ message: "Unauthorized." });
  }
  next();
};
