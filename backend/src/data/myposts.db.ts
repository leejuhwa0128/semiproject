// 프로필 게시글 + 스토리 

import { getOracleConnection } from "../config/oracle";

export interface MyPostMediaItem {
  mediaId: number;
  postId: number;
  mediaUrl: string;
  mediaType: string | null;
  createdAt: Date;
  mediaCount: number; // ✅ 추가: 해당 게시글의 이미지 개수
}

/**
 * ✅ 내 게시글 대표사진(POST_ID별 MEDIA_ID 가장 작은 것) + mediaCount 같이 조회
 */
export async function findMyPostMedia(
  userId: number,
  offset: number,
  limit: number
): Promise<MyPostMediaItem[]> {
  let conn;
  try {
    conn = await getOracleConnection();

    const sql = `
      SELECT
        "mediaId",
        "postId",
        "mediaUrl",
        "mediaType",
        "createdAt",
        "mediaCount"
      FROM (
        SELECT
          pm.media_id   AS "mediaId",
          pm.post_id    AS "postId",
          pm.media_url  AS "mediaUrl",
          pm.media_type AS "mediaType",
          pm.created_at AS "createdAt",
          p.created_at  AS "postCreatedAt",

          COUNT(*) OVER (PARTITION BY pm.post_id) AS "mediaCount",  -- ✅ 같은 post_id 이미지 개수

          ROW_NUMBER() OVER (
            PARTITION BY pm.post_id
            ORDER BY pm.media_id ASC   -- ✅ 대표사진 = media_id 가장 작은 것
          ) AS rn
        FROM post_media pm
        JOIN posts p ON p.post_id = pm.post_id
        WHERE p.user_id = :userId
          AND (
            pm.media_type LIKE 'image%'
            OR pm.media_type = 'image'
            OR LOWER(pm.media_url) LIKE '%.jpg'
            OR LOWER(pm.media_url) LIKE '%.jpeg'
            OR LOWER(pm.media_url) LIKE '%.png'
            OR LOWER(pm.media_url) LIKE '%.webp'
            OR LOWER(pm.media_url) LIKE '%.gif'
          )
      )
      WHERE rn = 1
      ORDER BY "postCreatedAt" DESC, "postId" DESC
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    `;

    const result = await conn.execute(
      sql,
      { userId, offset, limit },
      { outFormat: 4002 }
    );

    return ((result.rows as any[]) ?? []) as MyPostMediaItem[];
  } finally {
    if (conn) await conn.close();
  }
}

/**
 * ✅ 대표사진(POST_ID별 1장) 총 개수
 */
export async function countMyPostMedia(userId: number): Promise<number> {
  let conn;
  try {
    conn = await getOracleConnection();

    const sql = `
      SELECT COUNT(*) AS "cnt"
      FROM (
        SELECT
          pm.post_id,
          ROW_NUMBER() OVER (
            PARTITION BY pm.post_id
            ORDER BY pm.media_id ASC
          ) AS rn
        FROM post_media pm
        JOIN posts p ON p.post_id = pm.post_id
        WHERE p.user_id = :userId
          AND (
            pm.media_type LIKE 'image%'
            OR pm.media_type = 'image'
            OR LOWER(pm.media_url) LIKE '%.jpg'
            OR LOWER(pm.media_url) LIKE '%.jpeg'
            OR LOWER(pm.media_url) LIKE '%.png'
            OR LOWER(pm.media_url) LIKE '%.webp'
            OR LOWER(pm.media_url) LIKE '%.gif'
          )
      )
      WHERE rn = 1
    `;

    const result = await conn.execute(sql, { userId }, { outFormat: 4002 });
    const cnt = (result.rows?.[0] as any)?.cnt ?? 0;
    return Number(cnt);
  } finally {
    if (conn) await conn.close();
  }
}
