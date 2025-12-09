import { Router } from "express";
import {
  findUserByLoginId,
  createUser,
} from "../../data/users.db";

const router = Router();

/**
 * 🔹 아이디 중복 확인
 * POST /api/sign/check-id
 * body: { loginId }
 */
router.post("/check-id", async (req, res) => {
  const { loginId } = req.body;

  if (!loginId) {
    return res.status(400).json({ message: "loginId는 필수값입니다." });
  }

  try {
    const exists = await findUserByLoginId(loginId);

    if (exists) {
      return res.status(409).json({ message: "이미 존재하는 아이디입니다." });
    }

    return res.json({ message: "사용 가능한 아이디입니다." });
  } catch (err: any) {
    console.error("ID 중복확인 오류:", err);
    return res.status(500).json({ message: "서버 오류", error: err.message });
  }
});

/**
 * 🔹 회원가입
 * POST /api/sign/register
 */
router.post("/register", async (req, res) => {
  const { loginId, password, email, nickname } = req.body;

  if (!loginId || !password) {
    return res.status(400).json({
      message: "loginId와 password는 필수값입니다.",
    });
  }

  try {
    // 1) 중복 체크
    const exists = await findUserByLoginId(loginId);
    if (exists) {
      return res.status(409).json({
        message: "이미 사용 중인 로그인 아이디입니다.",
      });
    }

    // 2) INSERT
    await createUser({ loginId, password, email, nickname });

    return res.status(201).json({
      message: "회원가입 성공",
    });
  } catch (err: any) {
    console.error("회원가입 오류:", err);
    return res.status(500).json({
      message: "서버 내부 오류",
      error: err.message ?? String(err),
    });
  }
});

export default router;
