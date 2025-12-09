// backend/src/routes/users/find.routes.ts
import { Router } from "express";
import {
  findUserByEmail,
  findUserByLoginIdAndEmail,
  updateUserPassword,
} from "../../data/users.db";
import { sendMail } from "../../config/mail"; // ⭐ 메일 모듈 import

const router = Router();

/**
 * 🔹 아이디 찾기
 * POST /api/users/find-id
 * body: { email }
 */
router.post("/find-id", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "email은 필수값입니다." });
  }

  try {
    const user = await findUserByEmail(email);

    if (!user) {
      return res
        .status(404)
        .json({ message: "해당 이메일로 등록된 계정이 없습니다." });
    }

    // ✅ 여기서 메일 발송
    await sendMail({
      to: user.email,
      subject: "[세미 프로젝트] 아이디 찾기 안내",
      text: `회원님의 아이디는 "${user.loginId}" 입니다.`,
      html: `
        <h3>아이디 찾기 안내</h3>
        <p>회원님의 아이디는 <b>${user.loginId}</b> 입니다.</p>
      `,
    });

    return res.json({
      message: "가입하신 이메일로 아이디를 전송했습니다.",
    });
  } catch (err: any) {
    console.error("아이디 찾기 오류:", err);
    return res
      .status(500)
      .json({ message: "서버 오류(아이디 찾기)", error: err.message });
  }
});

/**
 * 🔹 비밀번호 초기화 (임시 비밀번호 발급 + 메일 발송)
 * POST /api/users/reset-password
 * body: { loginId, email }
 */
router.post("/reset-password", async (req, res) => {
  const { loginId, email } = req.body;

  if (!loginId || !email) {
    return res.status(400).json({
      message: "loginId와 email은 필수값입니다.",
    });
  }

  try {
    const user = await findUserByLoginIdAndEmail(loginId, email);

    if (!user) {
      return res
        .status(404)
        .json({ message: "일치하는 계정을 찾을 수 없습니다." });
    }

    // 1) 임시 비밀번호 생성
    const tempPassword = Math.random().toString(36).slice(-10); // 10자리 랜덤 문자열

    // 2) DB에 비밀번호 업데이트
    await updateUserPassword(user.userId, tempPassword);

    // 3) 메일 발송
    await sendMail({
      to: user.email,
      subject: "[세미 프로젝트] 임시 비밀번호 안내",
      text: `임시 비밀번호는 "${tempPassword}" 입니다. 로그인 후 반드시 비밀번호를 변경해 주세요.`,
      html: `
        <h3>임시 비밀번호 안내</h3>
        <p>요청하신 계정(<b>${user.loginId}</b>)의 임시 비밀번호는 아래와 같습니다.</p>
        <p style="font-size:18px;"><b>${tempPassword}</b></p>
        <p>로그인 후 <b>반드시 비밀번호를 변경</b>해 주세요.</p>
      `,
    });

    return res.json({
      message: "임시 비밀번호를 이메일로 발송했습니다.",
      // tempPassword, // 개발 중에만 확인하고 싶으면 주석 해제
    });
  } catch (err: any) {
    console.error("비밀번호 초기화 오류:", err);
    return res
      .status(500)
      .json({ message: "서버 오류(비밀번호 초기화)", error: err.message });
  }
});

export default router;
