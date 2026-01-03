import oracledb, { Pool, Connection } from "oracledb";

oracledb.initOracleClient({
  libDir: "C:\\Users\\An\\Desktop\\instantclient-basic-windows.x64-21.19.0.0.0dbru\\instantclient_21_19",
});

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
