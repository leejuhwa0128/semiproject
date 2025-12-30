import { getOracleConnection } from "../config/oracle";

export async function toggleFollow(followerId: number, followingId: number) {
  const conn = await getOracleConnection();
  try {
    // 이미 팔로우 중인지 확인
    const check = await conn.execute(
      `SELECT 1 AS X FROM FOLLOWS
       WHERE FOLLOWER_ID = :followerId AND FOLLOWING_ID = :followingId`,
      { followerId, followingId },
      { outFormat: 4002 } // OUT_FORMAT_OBJECT (숫자상수 써도 되고 import해도 됨)
    );

    const isAlready = (check.rows?.length ?? 0) > 0;

    if (isAlready) {
      await conn.execute(
        `DELETE FROM FOLLOWS
         WHERE FOLLOWER_ID = :followerId AND FOLLOWING_ID = :followingId`,
        { followerId, followingId },
        { autoCommit: true }
      );
      return { isFollowing: false };
    } else {
      await conn.execute(
        `INSERT INTO FOLLOWS (FOLLOWER_ID, FOLLOWING_ID)
         VALUES (:followerId, :followingId)`,
        { followerId, followingId },
        { autoCommit: true }
      );
      return { isFollowing: true };
    }
  } finally {
    try {
      await conn.close();
    } catch {}
  }
}