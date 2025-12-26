import { getOracleConnection } from "../config/oracle";

export async function countPostLikes(postId: number): Promise<number> {
  let conn;
  try {
    conn = await getOracleConnection();
    const sql = `
      SELECT COUNT(*) AS "cnt"
      FROM post_likes
      WHERE post_id = :postId
    `;
    const result = await conn.execute(sql, { postId }, { outFormat: 4002 });
    const cnt = (result.rows?.[0] as any)?.cnt ?? 0;
    return Number(cnt);
  } finally {
    if (conn) await conn.close();
  }
}

export async function isPostLikedByUser(
  postId: number,
  userId: number
): Promise<boolean> {
  let conn;
  try {
    conn = await getOracleConnection();
    const sql = `
      SELECT COUNT(*) AS "cnt"
      FROM post_likes
      WHERE post_id = :postId AND user_id = :userId
    `;
    const result = await conn.execute(sql, { postId, userId }, { outFormat: 4002 });
    const cnt = (result.rows?.[0] as any)?.cnt ?? 0;
    return Number(cnt) > 0;
  } finally {
    if (conn) await conn.close();
  }
}

/**
 * ✅ 좋아요 토글
 * - 이미 좋아요면 삭제
 * - 아니면 insert
 * - 최종 상태(isLiked)와 likeCount 반환
 */
export async function togglePostLike(
  postId: number,
  userId: number
): Promise<{ isLiked: boolean; likeCount: number }> {
  let conn;
  try {
    conn = await getOracleConnection();

    // 1) 현재 좋아요 여부 확인
    const liked = await (async () => {
      const sql = `
        SELECT COUNT(*) AS "cnt"
        FROM post_likes
        WHERE post_id = :postId AND user_id = :userId
      `;
      const r = await conn!.execute(sql, { postId, userId }, { outFormat: 4002 });
      const cnt = (r.rows?.[0] as any)?.cnt ?? 0;
      return Number(cnt) > 0;
    })();

    if (liked) {
      // 2-A) 삭제
      await conn.execute(
        `DELETE FROM post_likes WHERE post_id = :postId AND user_id = :userId`,
        { postId, userId },
        { autoCommit: true }
      );
    } else {
      // 2-B) 추가 (유니크 제약 때문에 혹시 중복 insert되면 에러날 수 있음)
      await conn.execute(
        `
        INSERT INTO post_likes (like_id, post_id, user_id, created_at)
        VALUES (post_likes_seq.NEXTVAL, :postId, :userId, SYSDATE)
        `,
        { postId, userId },
        { autoCommit: true }
      );
    }

    // 3) 카운트 재조회
    const likeCount = await (async () => {
      const sql = `SELECT COUNT(*) AS "cnt" FROM post_likes WHERE post_id = :postId`;
      const r = await conn!.execute(sql, { postId }, { outFormat: 4002 });
      const cnt = (r.rows?.[0] as any)?.cnt ?? 0;
      return Number(cnt);
    })();

    return { isLiked: !liked, likeCount };
  } finally {
    if (conn) await conn.close();
  }
}
