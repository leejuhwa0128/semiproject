"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initOraclePool = initOraclePool;
exports.getOracleConnection = getOracleConnection;
const oracledb_1 = __importDefault(require("oracledb"));
oracledb_1.default.outFormat = oracledb_1.default.OUT_FORMAT_OBJECT;
let pool = null;
// 풀 생성 함수
async function initOraclePool() {
    if (pool)
        return; // 이미 만들어져 있으면 다시 생성 X
    pool = await oracledb_1.default.createPool({
        user: process.env.ORACLE_USER,
        password: process.env.ORACLE_PASSWORD,
        connectString: process.env.ORACLE_CONNECT_STRING,
    });
    console.log("✅ Oracle connection pool created");
}
// 커넥션 얻기 (필요하면 여기서도 자동으로 풀 초기화)
async function getOracleConnection() {
    if (!pool) {
        // 👉 여기서도 안전하게 풀 생성
        await initOraclePool();
    }
    return pool.getConnection();
}
