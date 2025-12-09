import { Router, Request, Response } from "express";
import { getOracleConnection } from "../../config/oracle";

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

  let conn;

  try {
    conn = await getOracleConnection();

    // 1) 해당 login_id가 존재하는지 조회
    const sql = `
      SELECT user_id, login_id, password, email, nickname
      FROM users
      WHERE login_id = :loginId
    `;
    const result = await conn.execute(sql, { loginId });

    // 결과 없으면 아이디 없음
    if (!result.rows || result.rows.length === 0) {
      return res.status(401).json({
        message: "존재하지 않는 아이디입니다.",
      });
    }

    const user = result.rows[0] as any;

    // 2) 비밀번호 일치 확인
    if (user.PASSWORD !== password) {
      return res.status(401).json({
        message: "비밀번호가 일치하지 않습니다.",
      });
    }

    // 3) 성공 처리
    return res.json({
      message: "로그인 성공 🔥",
      user: {
        userId: user.USER_ID,
        loginId: user.LOGIN_ID,
        email: user.EMAIL,
        nickname: user.NICKNAME,
      },
    });

  } catch (err: any) {
    console.error("로그인 오류:", err);
    return res.status(500).json({
      message: "오류 : ",
      error: err.message,
    });
  } finally {
    if (conn) await conn.close();
  }
});

export default router;
