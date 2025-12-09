import { Router, Request, Response } from "express";
import { validateUser } from "../../data/users.db";
import { signToken } from "../../config/jwt";

const router = Router();

// GET - API 연결 확인
router.get("/login", (req: Request, res: Response) => {
  res.json({ message: "LOGIN API 연결됨" });
});

// POST - 실제 로그인 처리
router.post("/login", async (req: Request, res: Response) => {
  const { loginId, password } = req.body;

  if (!loginId || !password) {
    return res.status(400).json({
      message: "아이디와 비밀번호를 모두 입력하세요.",
    });
  }

  try {
    const user = await validateUser(loginId, password);

    if (!user) {
      return res.status(401).json({
        message: "아이디 또는 비밀번호가 올바르지 않습니다.",
      });
    }

    const token = signToken({
      userId: user.userId,
      loginId: user.loginId,
      email: user.email,
      nickname: user.nickname,
    });

    console.log("🔐 JWT 발급됨:", token);

    return res.json({
      message: "로그인 성공 🔥",
      token,
      user: {
        userId: user.userId,
        loginId: user.loginId,
        email: user.email,
        nickname: user.nickname,
      },
    });
  } catch (err: any) {
    console.error("로그인 오류:", err);
    return res.status(500).json({
      message: "서버 오류",
      error: err.message,
    });
  }
});

export default router;
