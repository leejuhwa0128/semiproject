import oracledb from "oracledb";
import { getOracleConnection } from "../config/oracle";

export type RecommendedFeedRow = {
  type: "POST" | "STORY";
  id: number;
  content: string;
  emotion: number;

  likeCount: number;
  isLiked: boolean;

  authorNickname: string;
  authorProfileUrl: string | null;
  mediaUrls: string[];
};

export async function getBaseEmotion(userId: number): Promise<number> {
  let conn;
  try {
    conn = await getOracleConnection();
    const res = await conn.execute<{ CURRENT_EMOTION_ID: number }>(
      `SELECT CURRENT_EMOTION_ID FROM USERS WHERE USER_ID = :userId`,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return res.rows?.[0]?.CURRENT_EMOTION_ID ?? 5;
  } finally {
    if (conn) await conn.close();
  }
}

export async function getRecommendedFeed(baseEmotion: number, userId: number): Promise<RecommendedFeedRow[]> {
  let conn;
  try {
    conn = await getOracleConnection();

    const sql = `
SELECT *
FROM (
  -- POST
  SELECT 
    'POST' AS TYPE,
    p.post_id AS ID,
    p.content AS CONTENT,
    p.emotion AS EMOTION,
    u.nickname AS AUTHOR_NICKNAME,
    u.profile_image_url AS AUTHOR_PROFILE_URL,
    (SELECT COUNT(*) FROM post_likes WHERE post_id = p.post_id) AS LIKE_COUNT,
    CASE WHEN EXISTS (
      SELECT 1 FROM post_likes WHERE post_id = p.post_id AND user_id = :userId
    ) THEN 1 ELSE 0 END AS IS_LIKED,
    LISTAGG(pm.media_url, ',') WITHIN GROUP (ORDER BY pm.MEDIA_ID) AS MEDIA_URLS
  FROM posts p
  JOIN users u ON u.user_id = p.user_id
  LEFT JOIN post_media pm ON pm.post_id = p.post_id
  GROUP BY p.post_id, p.content, p.emotion, u.nickname, u.profile_image_url

  UNION ALL

  -- STORY
  SELECT 
    'STORY' AS TYPE,
    s.story_id AS ID,
    s.content AS CONTENT,
    s.emotion_score AS EMOTION,
    u.nickname AS AUTHOR_NICKNAME,
    u.profile_image_url AS AUTHOR_PROFILE_URL,
    (SELECT COUNT(*) FROM stories_likes WHERE story_id = s.story_id) AS LIKE_COUNT,
    CASE WHEN EXISTS (
      SELECT 1 FROM stories_likes WHERE story_id = s.story_id AND user_id = :userId
    ) THEN 1 ELSE 0 END AS IS_LIKED,
    LISTAGG(sm.media_url, ',') WITHIN GROUP (ORDER BY sm.MEDIA_ID) AS MEDIA_URLS
  FROM stories s
  JOIN users u ON u.user_id = s.user_id
  LEFT JOIN story_media sm ON sm.story_id = s.story_id
  GROUP BY s.story_id, s.content, s.emotion_score, u.nickname, u.profile_image_url
)
ORDER BY ABS(EMOTION - :baseEmotion)
`;

    const result = await conn.execute<any>(
      sql,
      { userId, baseEmotion },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    // MEDIA_URLS 콤마 문자열 → 배열
    return (result.rows ?? []).map(r => ({
      type: r.TYPE,
      id: r.ID,
      content: r.CONTENT,
      emotion: r.EMOTION,

      likeCount: Number(r.LIKE_COUNT),
      isLiked: Number(r.IS_LIKED) === 1,

      authorNickname: r.AUTHOR_NICKNAME,
      authorProfileUrl: r.AUTHOR_PROFILE_URL,
      mediaUrls: r.MEDIA_URLS ? r.MEDIA_URLS.split(",") : [],
    }));
  } finally {
    if (conn) await conn.close();
  }
}
