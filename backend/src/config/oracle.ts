import oracledb, { Pool, Connection } from "oracledb";

// OS별 Instant Client 경로를 env로 분리
const isWindows = process.platform === "win32";
const isMac = process.platform === "darwin";

let libDir: string | undefined;

if (isWindows) {
  libDir = process.env.ORACLE_CLIENT_LIB_DIR_WINDOWS;
} else if (isMac) {
  libDir = process.env.ORACLE_CLIENT_LIB_DIR_MAC;
}
// libDir가 있을 때만 Thick mode 활성화
if (libDir) {
  oracledb.initOracleClient({ libDir });
}

oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;

let pool: Pool | null = null;

// 풀 생성 함수
export async function initOraclePool() {
  if (pool) return; // 이미 만들어져 있으면 다시 생성 X

  pool = await oracledb.createPool({
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString: process.env.ORACLE_CONNECT_STRING,
  });

  console.log("✅ Oracle connection pool created");
}

// 커넥션 얻기 (필요하면 여기서도 자동으로 풀 초기화)
export async function getOracleConnection(): Promise<Connection> {
  if (!pool) {
    // 👉 여기서도 안전하게 풀 생성
    await initOraclePool();
  }
  return pool!.getConnection();
}