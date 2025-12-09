import jwt, { Secret } from "jsonwebtoken";

const JWT_SECRET: Secret = process.env.JWT_SECRET || "dev-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";

// payload 타입
export interface JwtPayload extends Record<string, any> {
  userId: number;
  loginId: string;
  email?: string;
  nickname?: string;
}

// ✅ 토큰 발급
export function signToken(payload: JwtPayload): string {
  return jwt.sign(
    payload,
    JWT_SECRET,
    {
      // 여기서 타입만 any로 살짝 눌러주기
      expiresIn: JWT_EXPIRES_IN as any,
    }
  );
}

// ✅ 토큰 검증
export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}
