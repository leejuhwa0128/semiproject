"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const oracle_1 = require("../../config/oracle");
const router = (0, express_1.Router)();
/**
 * 🔹 아이디 중복 확인
 * POST /api/sign/check-id
 * body: { loginId }
 */
router.post("/check-id", async (req, res) => {
    var _a, _b;
    const { loginId } = req.body;
    console.log("아이디 중복확인 요청:", req.body);
    if (!loginId) {
        return res.status(400).json({
            message: "loginId는 필수값입니다.",
        });
    }
    let conn;
    try {
        conn = await (0, oracle_1.getOracleConnection)();
        const sql = `
      SELECT COUNT(*) AS CNT
      FROM users
      WHERE login_id = :loginId
    `;
        const result = await conn.execute(sql, { loginId });
        const count = Number(((_b = (_a = result.rows) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.CNT) || 0);
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
    }
    catch (err) {
        console.error("ID 중복확인 오류:", err);
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
                // 무시
            }
        }
    }
});
// 회원가입
router.post("/register", async (req, res) => {
    var _a, _b, _c;
    const { loginId, password, email, nickname } = req.body;
    console.log("회원가입 요청 바디:", req.body);
    if (!loginId || !password) {
        return res.status(400).json({
            message: "loginId와 password는 필수값입니다.",
        });
    }
    let conn;
    try {
        conn = await (0, oracle_1.getOracleConnection)();
        // 1) login_id 중복 체크 (서버단에서도 한 번 더 안전하게)
        const checkSql = `
      SELECT COUNT(*) AS CNT
      FROM users
      WHERE login_id = :loginId
    `;
        const checkResult = await conn.execute(checkSql, { loginId });
        const cntRow = (_a = checkResult.rows) === null || _a === void 0 ? void 0 : _a[0];
        const count = Number((_b = cntRow === null || cntRow === void 0 ? void 0 : cntRow.CNT) !== null && _b !== void 0 ? _b : 0);
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
        const result = await conn.execute(insertSql, { loginId, password, email, nickname }, { autoCommit: true });
        console.log("INSERT 결과 rowsAffected:", result.rowsAffected);
        // 3) 성공 응답
        return res.status(201).json({
            message: "회원가입 성공",
        });
    }
    catch (err) {
        console.error("회원가입 오류:", err);
        return res.status(500).json({
            message: "서버 내부 오류",
            error: (_c = err.message) !== null && _c !== void 0 ? _c : String(err),
        });
    }
    finally {
        if (conn) {
            try {
                await conn.close();
            }
            catch (closeErr) {
                console.error("DB 연결 종료 오류:", closeErr);
            }
        }
    }
});
exports.default = router;
