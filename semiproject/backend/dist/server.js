"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const login_routes_1 = __importDefault(require("./routes/users/login.routes"));
const sign_routes_1 = __importDefault(require("./routes/users/sign.routes"));
const main_routes_1 = __importDefault(require("./routes/main/main.routes"));
const find_routes_1 = __importDefault(require("./routes/users/find.routes"));
//DB 연결
require("dotenv/config");
const oracle_1 = require("./config/oracle");
const app = (0, express_1.default)();
const PORT = 4000;
// JSON body 파싱
app.use(express_1.default.json());
// CORS 설정
app.use((0, cors_1.default)({
    origin: 'http://localhost:5173',
    credentials: true,
}));
// 헬스 체크
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'Backend is running 🚀' });
});
// 로그인 라우터
app.use('/api/users', login_routes_1.default);
// 회원가입 라우터
app.use('/api/sign', sign_routes_1.default);
// 메인 페이지
app.use("/api/main", main_routes_1.default);
// 이메일 인증
app.use("/api/users", find_routes_1.default);
// 서버 시작 (Oracle 풀 준비 후)
(async () => {
    try {
        await (0, oracle_1.initOraclePool)(); // 👈 여기서 한 번 생성
        app.listen(PORT, () => {
            console.log(`✅ Backend server running at http://localhost:${PORT}`);
        });
    }
    catch (err) {
        console.error("서버 시작 실패:", err);
        process.exit(1);
    }
})();
