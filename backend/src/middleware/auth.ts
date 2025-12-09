import { Request, Response, NextFunction } from "express";
import { verifyToken, JwtPayload } from "../config/jwt";

export interface AuthRequest extends Request {
  user?: JwtPayload;
}

export function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader =
    req.headers.authorization ||
    (req.headers["Authorization"] as string) ||
    "";

  if (!authHeader) {
    return res.status(401).json({ message: "인증 토큰이 없습니다." });
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({ message: "잘못된 인증 형식입니다." });
  }

  const token = parts[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("JWT 검증 실패:", err);
    return res.status(401).json({ message: "유효하지 않은 토큰입니다." });
  }
}
