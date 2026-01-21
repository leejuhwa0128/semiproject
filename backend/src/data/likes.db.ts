import { getOracleConnection } from "../config/oracle";

export type LatestLiker = {
  userId: number;
  nickname: string;
  profileImageUrl: string | null;
} | null;

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
 * 좋아요 토글
 */
export async function togglePostLike(
  postId: number,
  userId: number
): Promise<{ isLiked: boolean; likeCount: number; latestLiker: LatestLiker }> {
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
      // 2-B) 추가
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
      const sql = `
        SELECT COUNT(*) AS "cnt"
        FROM post_likes
        WHERE post_id = :postId
      `;
      const r = await conn!.execute(sql, { postId }, { outFormat: 4002 });
      const cnt = (r.rows?.[0] as any)?.cnt ?? 0;
      return Number(cnt);
    })();

    // 4) 최신 좋아요 누른 사람(좋아요가 0이면 null)
    const latestLiker: LatestLiker =
      likeCount === 0
        ? null
        : await (async () => {
            const sql = `
              SELECT "userId", "nickname", "profileImageUrl"
              FROM (
                SELECT
                  u.user_id           AS "userId",
                  u.nickname          AS "nickname",
                  u.profile_image_url AS "profileImageUrl"
                FROM post_likes pl
                JOIN users u ON u.user_id = pl.user_id
                WHERE pl.post_id = :postId
                ORDER BY pl.created_at DESC, pl.like_id DESC
              )
              FETCH FIRST 1 ROWS ONLY
            `;
            const r = await conn!.execute(sql, { postId }, { outFormat: 4002 });
            const row = r.rows?.[0] as any;

            if (!row) return null;

            return {
              userId: Number(row.userId),
              nickname: String(row.nickname),
              profileImageUrl: row.profileImageUrl ? String(row.profileImageUrl) : null,
            };
          })();

    return { isLiked: !liked, likeCount, latestLiker };
  } finally {
    if (conn) await conn.close();
  }
}


/* =========================
   STORY LIKES
========================= */

/** 스토리 좋아요 수 */
export async function countStoryLikes(storyId: number): Promise<number> {
  let conn;
  try {
    conn = await getOracleConnection();
    const sql = `
      SELECT COUNT(*) AS "cnt"
      FROM stories_likes
      WHERE story_id = :storyId
    `;
    const result = await conn.execute(sql, { storyId }, { outFormat: 4002 });
    const cnt = (result.rows?.[0] as any)?.cnt ?? 0;
    return Number(cnt);
  } finally {
    if (conn) await conn.close();
  }
}

/** 내가 이 스토리를 좋아요 했는지 */
export async function isStoryLikedByUser(
  storyId: number,
  userId: number
): Promise<boolean> {
  let conn;
  try {
    conn = await getOracleConnection();
    const sql = `
      SELECT COUNT(*) AS "cnt"
      FROM stories_likes
      WHERE story_id = :storyId AND user_id = :userId
    `;
    const result = await conn.execute(
      sql,
      { storyId, userId },
      { outFormat: 4002 }
    );
    const cnt = (result.rows?.[0] as any)?.cnt ?? 0;
    return Number(cnt) > 0;
  } finally {
    if (conn) await conn.close();
  }
}

/**
 * 스토리 좋아요 토글
 */
export async function toggleStoryLike(
  storyId: number,
  userId: number
): Promise<{
  isLiked: boolean;
  likeCount: number;
  latestLiker: LatestLiker;
}> {
  let conn;
  try {
    conn = await getOracleConnection();

    /** 1️⃣ 현재 좋아요 여부 */
    const liked = await (async () => {
      const sql = `
        SELECT COUNT(*) AS "cnt"
        FROM stories_likes
        WHERE story_id = :storyId AND user_id = :userId
      `;
      const r = await conn!.execute(
        sql,
        { storyId, userId },
        { outFormat: 4002 }
      );
      const cnt = (r.rows?.[0] as any)?.cnt ?? 0;
      return Number(cnt) > 0;
    })();

    /** 2️⃣ 토글 */
    if (liked) {
      await conn.execute(
        `
        DELETE FROM stories_likes
        WHERE story_id = :storyId AND user_id = :userId
        `,
        { storyId, userId },
        { autoCommit: true }
      );
    } else {
      await conn.execute(
        `
        INSERT INTO stories_likes
          (like_id, story_id, user_id, created_at)
        VALUES
          (stories_likes_seq.NEXTVAL, :storyId, :userId, SYSDATE)
        `,
        { storyId, userId },
        { autoCommit: true }
      );
    }

    /** 3️⃣ 좋아요 수 */
    const likeCount = await countStoryLikes(storyId);

    /** 4️⃣ 최신 좋아요 누른 사람 */
    const latestLiker: LatestLiker =
      likeCount === 0
        ? null
        : await (async () => {
            const sql = `
              SELECT "userId", "nickname", "profileImageUrl"
              FROM (
                SELECT
                  u.user_id           AS "userId",
                  u.nickname          AS "nickname",
                  u.profile_image_url AS "profileImageUrl"
                FROM stories_likes sl
                JOIN users u ON u.user_id = sl.user_id
                WHERE sl.story_id = :storyId
                ORDER BY sl.created_at DESC, sl.like_id DESC
              )
              FETCH FIRST 1 ROWS ONLY
            `;
            const r = await conn!.execute(
              sql,
              { storyId },
              { outFormat: 4002 }
            );
            const row = r.rows?.[0] as any;
            if (!row) return null;

            return {
              userId: Number(row.userId),
              nickname: String(row.nickname),
              profileImageUrl: row.profileImageUrl
                ? String(row.profileImageUrl)
                : null,
            };
          })();

    return {
      isLiked: !liked,
      likeCount,
      latestLiker,
    };
  } finally {
    if (conn) await conn.close();
  }
}