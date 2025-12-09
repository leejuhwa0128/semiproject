"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const oracle_1 = require("../../config/oracle");
const mail_1 = require("../../config/mail");
const router = (0, express_1.Router)();
/**
 * 🔹 랜덤 임시 비밀번호 생성 유틸 함수
 */
function generateTempPassword(length = 10) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$";
    let pw = "";
    for (let i = 0; i < length; i++) {
        pw += chars[Math.floor(Math.random() * chars.length)];
    }
    return pw;
}
/**
 * 🔹 아이디 찾기
 * POST /api/users/find-id
 * body: { email }
 */
router.post("/find-id", async (req, res) => {
    const { email } = req.body;
    console.log("아이디 찾기 요청:", req.body);
    if (!email) {
        return res.status(400).json({ message: "이메일을 입력하세요." });
    }
    let conn;
    try {
        conn = await (0, oracle_1.getOracleConnection)();
        const sql = `
      SELECT login_id
      FROM users
      WHERE email = :email
    `;
        const result = await conn.execute(sql, { email });
        if (!result.rows || result.rows.length === 0) {
            return res
                .status(404)
                .json({ message: "해당 이메일로 가입된 계정이 없습니다." });
        }
        const loginIds = result.rows.map((row) => row.LOGIN_ID);
        const html = `
      <p>안녕하세요.</p>
      <p>요청하신 이메일(<b>${email}</b>)로 가입된 아이디는 다음과 같습니다.</p>
      <ul>
        ${loginIds.map((id) => `<li>${id}</li>`).join("")}
      </ul>
      <p>감사합니다.</p>
    `;
        await (0, mail_1.sendMail)({
            to: email,
            subject: "[세미 프로젝트] 아이디 찾기 안내",
            html,
        });
        return res.json({
            message: "등록된 아이디를 이메일로 발송했습니다.",
        });
    }
    catch (err) {
        console.error("아이디 찾기 오류:", err);
        return res.status(500).json({
            message: "서버 오류",
            error: err.message,
        });
    }
    finally {
        if (conn) {
            try {
                await conn.close();
            }
            catch {
                // ignore
            }
        }
    }
});
/**
 * 🔹 비밀번호 찾기 (임시 비밀번호 발급)
 * POST /api/users/reset-password
 * body: { loginId, email }
 */
router.post("/reset-password", async (req, res) => {
    const { loginId, email } = req.body;
    console.log("비밀번호 찾기 요청:", req.body);
    if (!loginId || !email) {
        return res.status(400).json({
            message: "아이디와 이메일을 모두 입력하세요.",
        });
    }
    let conn;
    try {
        conn = await (0, oracle_1.getOracleConnection)();
        // 1. 아이디 + 이메일 일치하는 사용자 확인
        const selectSql = `
      SELECT user_id, login_id, email
      FROM users
      WHERE login_id = :loginId
        AND email = :email
    `;
        const selectResult = await conn.execute(selectSql, { loginId, email });
        if (!selectResult.rows || selectResult.rows.length === 0) {
            return res.status(404).json({
                message: "아이디와 이메일이 일치하는 계정을 찾을 수 없습니다.",
            });
        }
        // 2. 임시 비밀번호 생성
        const tempPassword = generateTempPassword();
        // 3. DB에 비밀번호 업데이트 (지금은 평문, 나중에 bcrypt 적용 가능)
        const updateSql = `
      UPDATE users
      SET password = :password
      WHERE login_id = :loginId
        AND email = :email
    `;
        await conn.execute(updateSql, { password: tempPassword, loginId, email }, { autoCommit: true });
        // 4. 메일 발송
        const html = `
      <p>안녕하세요.</p>
      <p>요청하신 계정(<b>${loginId}</b>)의 임시 비밀번호를 발급해 드립니다.</p>
      <p style="font-size:18px; font-weight:bold;">${tempPassword}</p>
      <p>로그인 후 반드시 비밀번호를 변경해 주세요.</p>
    `;
        await (0, mail_1.sendMail)({
            to: email,
            subject: "[세미 프로젝트] 임시 비밀번호 안내",
            html,
        });
        return res.json({
            message: "임시 비밀번호를 이메일로 발송했습니다.",
        });
    }
    catch (err) {
        console.error("비밀번호 찾기 오류:", err);
        return res.status(500).json({
            message: "서버 오류",
            error: err.message,
        });
    }
    finally {
        if (conn) {
            try {
                await conn.close();
            }
            catch {
                // ignore
            }
        }
    }
});
exports.default = router;
