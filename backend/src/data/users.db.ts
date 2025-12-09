// backend/src/data/users.db.ts
import { getOracleConnection } from "../config/oracle";

export interface User {
  userId: number;
  loginId: string;
  password: string;
  email: string;
  nickname: string;
  currentEmotionId: number | null;
  createdAt: Date;
  intro: string | null;             
  profileImageUrl: string | null;
}

/**
 * 🔹 로그인 검증 (loginId로 조회 후 비밀번호 비교)
 *    → 이후 bcrypt 로 변경 예정
 */
export async function validateUser(
  loginId: string,
  password: string
): Promise<User | null> {
  const user = await findUserByLoginId(loginId);

  console.log("🔍 로그인 시도 loginId:", loginId);
  console.log("🔍 입력한 password:", password);
  console.log("🔍 DB 저장된 password:", user?.password);

  if (!user) {
    console.log("❌ 로그인 실패: 존재하지 않는 아이디");
    return null;
  }

  // 현재는 평문 비교 → 나중에 bcrypt.compare 적용 가능
  if (user.password !== password) {
    console.log("❌ 로그인 실패: 비밀번호 불일치");
    return null;
  }

  console.log("✅ 로그인 성공:", user.loginId);
  return user;
}


/**
 * 🔹 loginId로 유저 조회
 */
export async function findUserByLoginId(loginId: string): Promise<User | null> {
  let conn;

  try {
    conn = await getOracleConnection();

    const sql = `
      SELECT
        user_id            AS "userId",
        login_id           AS "loginId",
        password           AS "password",
        email              AS "email",
        nickname           AS "nickname",
        current_emotion_id AS "currentEmotionId",
        created_at         AS "createdAt",
        intro              AS "intro",
        profile_image_url  AS "profileImageUrl"
      FROM users
      WHERE login_id = :loginId
    `;

    const result = await conn.execute(sql, { loginId }, { outFormat: 4002 });

    if (!result.rows || result.rows.length === 0) return null;

    return result.rows[0] as User;
  } finally {
    if (conn) await conn.close();
  }
}

/**
 * 🔹 Email로 유저 조회
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  let conn;
  try {
    conn = await getOracleConnection();

    const sql = `
      SELECT
        user_id            AS "userId",
        login_id           AS "loginId",
        password           AS "password",
        email              AS "email",
        nickname           AS "nickname",
        current_emotion_id AS "currentEmotionId",
        created_at         AS "createdAt",
        intro              AS "intro",
        profile_image_url  AS "profileImageUrl"
      FROM users
      WHERE email = :email
    `;

    const result = await conn.execute(sql, { email }, { outFormat: 4002 });

    if (!result.rows || result.rows.length === 0) return null;

    return result.rows[0] as User;
  } finally {
    if (conn) await conn.close();
  }
}

/**
 * 🔹 loginId + email 조회 (비밀번호 찾기용)
 */
export async function findUserByLoginIdAndEmail(
  loginId: string,
  email: string
): Promise<User | null> {
  let conn;
  try {
    conn = await getOracleConnection();

    const sql = `
      SELECT
        user_id            AS "userId",
        login_id           AS "loginId",
        password           AS "password",
        email              AS "email",
        nickname           AS "nickname",
        current_emotion_id AS "currentEmotionId",
        created_at         AS "createdAt",
        intro              AS "intro",
        profile_image_url  AS "profileImageUrl"
      FROM users
      WHERE login_id = :loginId
        AND email    = :email
    `;

    const result = await conn.execute(
      sql,
      { loginId, email },
      { outFormat: 4002 }
    );

    if (!result.rows || result.rows.length === 0) return null;

    return result.rows[0] as User;
  } finally {
    if (conn) await conn.close();
  }
}

/**
 * 🔹 회원 생성
 */
export async function createUser(data: {
  loginId: string;
  password: string;
  email: string;
  nickname: string;
}): Promise<void> {
  let conn;

  try {
    conn = await getOracleConnection();

    const sql = `
      INSERT INTO users
        (user_id, login_id, password, email, nickname, created_at)
      VALUES
        (user_seq.NEXTVAL, :loginId, :password, :email, :nickname, SYSDATE)
    `;

    await conn.execute(
      sql,
      {
        loginId: data.loginId,
        password: data.password,
        email: data.email,
        nickname: data.nickname,
      },
      { autoCommit: true }
    );
  } finally {
    if (conn) await conn.close();
  }
}

/**
 * 🔹 비밀번호 변경
 */
export async function updateUserPassword(
  userId: number,
  newPassword: string
): Promise<void> {
  let conn;
  try {
    conn = await getOracleConnection();

    const sql = `
      UPDATE users
      SET password = :newPassword
      WHERE user_id = :userId
    `;

    await conn.execute(
      sql,
      { newPassword, userId },
      { autoCommit: true }
    );
  } finally {
    if (conn) await conn.close();
  }
}

/**
 * 🔹 프로필 조회 + 게시글/팔로워/팔로우 집계
 */
export async function findUserById(userId: number): Promise<any> {
  let conn;

  try {
    conn = await getOracleConnection();

    const sql = `
      SELECT 
        u.user_id            AS "userId",
        u.login_id           AS "loginId",
        u.email              AS "email",
        u.nickname           AS "nickname",
        u.current_emotion_id AS "currentEmotionId",
        u.created_at         AS "createdAt",
        u.intro              AS "intro",
        u.profile_image_url  AS "profileImageUrl",
        (SELECT COUNT(*) FROM posts  p  WHERE p.user_id  = u.user_id) AS "postCount",
        (SELECT COUNT(*) FROM follow f1 WHERE f1.following_id = u.user_id) AS "followerCount",
        (SELECT COUNT(*) FROM follow f2 WHERE f2.follower_id  = u.user_id) AS "followingCount"
      FROM users u
      WHERE u.user_id = :userId
    `;

    const result = await conn.execute(
      sql,
      { userId },
      { outFormat: 4002 }
    );

    if (!result.rows || result.rows.length === 0) return null;

    return result.rows[0];
  } finally {
    if (conn) await conn.close();
  }
}

