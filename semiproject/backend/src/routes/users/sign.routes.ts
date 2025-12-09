import { Router } from "express";
import { getOracleConnection } from "../../config/oracle";

const router = Router();

/**
 * 🔹 아이디 중복 확인
 * POST /api/sign/check-id
 * body: { loginId }
 */
router.post("/check-id", async (req, res) => {
  const { loginId } = req.body;

  console.log("아이디 중복확인 요청:", req.body);

  if (!loginId) {
    return res.status(400).json({
      message: "loginId는 필수값입니다.",
    });
  }

  let conn;

  try {
    conn = await getOracleConnection();

    const sql = `
      SELECT COUNT(*) AS CNT
      FROM users
      WHERE login_id = :loginId
    `;
    const result = await conn.execute(sql, { loginId });

    const count = Number((result.rows?.[0] as any)?.CNT || 0);
    console.log("중복확인 count:", count);

    if (count > 0) {
      // 이미 존재하는 아이디
      return res.status(409).json({
        message: "이미 존재하는 아이디입니다.",
      });
    }

    // 사용 가능한 아이디
    return res.json({
      message: "사용 가능한 아이디입니다.",
    });
  } catch (err: any) {
    console.error("ID 중복확인 오류:", err);
    return res.status(500).json({
      message: "서버 오류",
      error: err.message,
    });
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch {
        // 무시
      }
    }
  }
});

// 회원가입
router.post("/register", async (req, res) => {
  const { loginId, password, email, nickname } = req.body;

  console.log("회원가입 요청 바디:", req.body);

  if (!loginId || !password) {
    return res.status(400).json({
      message: "loginId와 password는 필수값입니다.",
    });
  }

  let conn;

  try {
    conn = await getOracleConnection();

    // 1) login_id 중복 체크 (서버단에서도 한 번 더 안전하게)
    const checkSql = `
      SELECT COUNT(*) AS CNT
      FROM users
      WHERE login_id = :loginId
    `;
    const checkResult = await conn.execute(checkSql, { loginId });

    const cntRow = checkResult.rows?.[0] as any;
    const count = Number(cntRow?.CNT ?? 0);

    console.log("회원가입 중복 체크 count:", count);

    if (count > 0) {
      return res.status(409).json({
        message: "이미 사용 중인 로그인 아이디입니다.",
      });
    }

    // 2) INSERT - user_id는 시퀀스로 직접 사용
    const insertSql = `
      INSERT INTO users (user_id, login_id, password, email, nickname)
      VALUES (user_seq.NEXTVAL, :loginId, :password, :email, :nickname)
    `;

    const result = await conn.execute(
      insertSql,
      { loginId, password, email, nickname },
      { autoCommit: true }
    );

    console.log("INSERT 결과 rowsAffected:", result.rowsAffected);

    // 3) 성공 응답
    return res.status(201).json({
      message: "회원가입 성공",
    });
  } catch (err: any) {
    console.error("회원가입 오류:", err);

    return res.status(500).json({
      message: "서버 내부 오류",
      error: err.message ?? String(err),
    });
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch (closeErr) {
        console.error("DB 연결 종료 오류:", closeErr);
      }
    }
  }
});

export default router;
