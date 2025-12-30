import { getOracleConnection } from "../config/oracle";

export async function toggleFollow(followerId: number, followingId: number) {
  let conn;
  try {
    conn = await getOracleConnection();

    // 1) 이미 팔로우 중인지 확인
    const check = await conn.execute(
      `
      SELECT 1 AS "x"
      FROM follow
      WHERE follower_id = :followerId
        AND following_id = :followingId
      `,
      { followerId, followingId },
      { outFormat: 4002 }
    );

    const isAlready = (check.rows?.length ?? 0) > 0;

    if (isAlready) {
      // 2-A) 언팔로우
      await conn.execute(
        `
        DELETE FROM follow
        WHERE follower_id = :followerId
          AND following_id = :followingId
        `,
        { followerId, followingId },
        { autoCommit: true }
      );

      return { isFollowing: false };
    }

    // 2-B) 팔로우
    // ✅ 트리거가 없고 FOLLOW_ID가 NOT NULL이라서 시퀀스 필요
    // ✅ CREATED_AT은 DEFAULT SYSDATE라 INSERT에 안 넣어도 됨
    await conn.execute(
      `
      INSERT INTO follow (follow_id, follower_id, following_id)
      VALUES (follow_seq.NEXTVAL, :followerId, :followingId)
      `,
      { followerId, followingId },
      { autoCommit: true }
    );

    return { isFollowing: true };
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch {}
    }
  }
}


export async function removeFollower(params: {
  meUserId: number;
  followerUserId: number;
}) {
  const { meUserId, followerUserId } = params;
  let conn;

  try {
    conn = await getOracleConnection();

    // followerUserId → 나(meUserId)를 팔로우 중인 관계 삭제
    const sql = `
      DELETE FROM follow
      WHERE follower_id = :followerUserId
        AND following_id = :meUserId
    `;

    const r = await conn.execute(
      sql,
      { followerUserId, meUserId },
      { autoCommit: true }
    );

    return (r.rowsAffected ?? 0) > 0;
  } finally {
    try {
      if (conn) await conn.close();
    } catch {}
  }
}
