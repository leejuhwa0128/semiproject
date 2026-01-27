import oracledb from "oracledb";
import { getOracleConnection } from "../config/oracle";

/* =========================
   타입 정의
========================= */
export type RecommendedFeedRow = {
  type: "POST" | "STORY";
  id: number;
  authorId: number;
  content: string;
  emotion: number;

  likeCount: number;
  isLiked: boolean;

  authorNickname: string;
  authorProfileUrl: string | null;
  mediaUrls: string[];
};

/* =========================
   1️⃣ 가장 최근 스토리 감정
========================= */
export async function getLatestStoryEmotion(
  userId: number
): Promise<number | null> {
  let conn;
  try {
    conn = await getOracleConnection();

    const res = await conn.execute<{ EMOTION_SCORE: number }>(
      `
      SELECT emotion_score
      FROM (
        SELECT emotion_score
        FROM stories
        WHERE user_id = :userId
        ORDER BY created_at DESC
      )
      WHERE ROWNUM = 1
      `,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return res.rows?.[0]?.EMOTION_SCORE ?? null;
  } finally {
    if (conn) await conn.close();
  }
}

/* =========================
   2️⃣ 게시글 평균 감정
========================= */
export async function getPostAverageEmotion(
  userId: number
): Promise<number | null> {
  let conn;
  try {
    conn = await getOracleConnection();

    const res = await conn.execute<{ AVG_EMOTION: number }>(
      `
      SELECT ROUND(AVG(emotion), 2) AS AVG_EMOTION
      FROM posts
      WHERE user_id = :userId
      `,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return res.rows?.[0]?.AVG_EMOTION ?? null;
  } finally {
    if (conn) await conn.close();
  }
}

/* =========================
   3️⃣ 최종 기준 감정 계산
   (스토리 70% + 게시글 30%)
========================= */
export async function calculateFinalBaseEmotion(
  userId: number
): Promise<number> {
  const storyEmotion = await getLatestStoryEmotion(userId);
  const postAvgEmotion = await getPostAverageEmotion(userId);

  let finalBaseEmotion = 5; // fallback 기본값

  if (storyEmotion !== null && postAvgEmotion !== null) {
    finalBaseEmotion = storyEmotion * 0.7 + postAvgEmotion * 0.3;
  } else if (storyEmotion !== null) {
    finalBaseEmotion = storyEmotion;
  } else if (postAvgEmotion !== null) {
    finalBaseEmotion = postAvgEmotion;
  }
  console.log("======");
  console.log("감정 알고리즘");
  console.log("storyEmotion:", storyEmotion);
  console.log("postAvgEmotion:", postAvgEmotion);
  console.log("finalBaseEmotion:", finalBaseEmotion);
  console.log("======");
  return Number(finalBaseEmotion.toFixed(2));
}

/* =========================
   4️⃣ 추천 피드 조회
========================= */
export async function getRecommendedFeed(
  baseEmotion: number,
  userId: number
): Promise<RecommendedFeedRow[]> {
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
        p.user_id AS AUTHOR_ID,
        p.content AS CONTENT,
        p.emotion AS EMOTION,
        u.nickname AS AUTHOR_NICKNAME,
        u.profile_image_url AS AUTHOR_PROFILE_URL,
        (SELECT COUNT(*) FROM post_likes WHERE post_id = p.post_id) AS LIKE_COUNT,
        CASE WHEN EXISTS (
          SELECT 1 FROM post_likes 
          WHERE post_id = p.post_id AND user_id = :userId
        ) THEN 1 ELSE 0 END AS IS_LIKED,
        LISTAGG(pm.media_url, ',') 
          WITHIN GROUP (ORDER BY pm.media_id) AS MEDIA_URLS
      FROM posts p
      JOIN users u ON u.user_id = p.user_id
      LEFT JOIN post_media pm ON pm.post_id = p.post_id
      GROUP BY 
        p.post_id, p.user_id, p.content, p.emotion,
        u.nickname, u.profile_image_url

      UNION ALL

      -- STORY
      SELECT 
        'STORY' AS TYPE,
        s.story_id AS ID,
        s.user_id AS AUTHOR_ID,
        s.content AS CONTENT,
        s.emotion_score AS EMOTION,
        u.nickname AS AUTHOR_NICKNAME,
        u.profile_image_url AS AUTHOR_PROFILE_URL,
        (SELECT COUNT(*) FROM stories_likes WHERE story_id = s.story_id) AS LIKE_COUNT,
        CASE WHEN EXISTS (
          SELECT 1 FROM stories_likes 
          WHERE story_id = s.story_id AND user_id = :userId
        ) THEN 1 ELSE 0 END AS IS_LIKED,
        LISTAGG(sm.media_url, ',') 
          WITHIN GROUP (ORDER BY sm.media_id) AS MEDIA_URLS
      FROM stories s
      JOIN users u ON u.user_id = s.user_id
      LEFT JOIN story_media sm ON sm.story_id = s.story_id
      GROUP BY 
        s.story_id, s.user_id, s.content, s.emotion_score,
        u.nickname, u.profile_image_url
    )
    `;

    const result = await conn.execute<any>(
      sql,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return (result.rows ?? []).map(r => ({
      type: r.TYPE,
      id: r.ID,
      authorId: r.AUTHOR_ID,
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
