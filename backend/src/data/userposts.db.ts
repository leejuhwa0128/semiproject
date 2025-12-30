import { getOracleConnection } from "../config/oracle";

export async function findUserPostMedia(userId: number, offset: number, limit: number) {
  const conn = await getOracleConnection();
  try {
    const r = await conn.execute(
      `
      SELECT *
      FROM (
        SELECT
          pm.media_id AS "mediaId",
          pm.post_id  AS "postId",
          pm.media_url AS "mediaUrl",
          pm.media_type AS "mediaType",
          pm.created_at AS "createdAt",
          COUNT(*) OVER (PARTITION BY pm.post_id) AS "mediaCount",
          ROW_NUMBER() OVER (PARTITION BY pm.post_id ORDER BY pm.media_id ASC) AS rn
        FROM posts p
        JOIN post_media pm ON pm.post_id = p.post_id
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
      ORDER BY "postId" DESC
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
      `,
      { userId, offset, limit },
      { outFormat: 4002 }
    );

    return r.rows ?? [];
  } finally {
    await conn.close();
  }
}

export async function countUserPostMedia(userId: number) {
  const conn = await getOracleConnection();
  try {
    const r = await conn.execute(
      `
      SELECT COUNT(*) AS "cnt"
      FROM (
        SELECT pm.post_id
        FROM posts p
        JOIN post_media pm ON pm.post_id = p.post_id
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
        GROUP BY pm.post_id
      )
      `,
      { userId },
      { outFormat: 4002 }
    );

    return Number((r.rows?.[0] as any)?.cnt ?? 0);
  } finally {
    await conn.close();
  }
}
