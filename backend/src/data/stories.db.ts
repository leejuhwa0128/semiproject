import oracledb from "oracledb";
import { getOracleConnection } from "../config/oracle";

/**
 * ✅ 스토리 생성 + 스토리 미디어 여러장 저장 + 감정점수 저장(EMOTION_SCORE)
 * mediaUrls: ["/uploads/stories/xxx.jpg", ...]
 */
export async function createStoryWithMedia(
  userId: number,
  content: string | null,
  mediaUrls: string[],
  emotionScore: number | null
) {
  const conn = await getOracleConnection();

  try {
    const r = await conn.execute(
      `
      INSERT INTO STORIES (USER_ID, CONTENT, EMOTION_SCORE)
      VALUES (:userId, :content, :emotionScore)
      RETURNING STORY_ID INTO :storyId
      `,
      {
        userId,
        content,
        emotionScore,
        storyId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: false }
    );

    const storyId = (r.outBinds as any).storyId[0] as number;

    if (mediaUrls.length > 0) {
      const binds = mediaUrls.map((url) => ({
        storyId,
        mediaType: "IMAGE",
        mediaUrl: url,
      }));

      await conn.executeMany(
        `
        INSERT INTO STORY_MEDIA (STORY_ID, MEDIA_TYPE, MEDIA_URL)
        VALUES (:storyId, :mediaType, :mediaUrl)
        `,
        binds,
        { autoCommit: false }
      );
    }

    await conn.commit();
    return storyId;
  } catch (e) {
    try {
      await conn.rollback();
    } catch {}
    throw e;
  } finally {
    try {
      await conn.close();
    } catch {}
  }
}

/**
 * ✅ 프로필 "스토리 탭" 그리드용 조회
 * - 스토리 1개당 대표 미디어 1개(가장 작은 MEDIA_ID)
 * - mediaCount 포함
 * - 페이징: offset/limit
 */
export async function getStoryMediaGrid(
  userId: number,
  offset: number,
  limit: number
) {
  const conn = await getOracleConnection();

  try {
    const result = await conn.execute(
      `
      SELECT
        sm.MEDIA_ID  AS "mediaId",
        s.STORY_ID   AS "storyId",
        sm.MEDIA_URL AS "mediaUrl",
        (SELECT COUNT(*)
           FROM STORY_MEDIA sm2
          WHERE sm2.STORY_ID = s.STORY_ID) AS "mediaCount"
      FROM STORIES s
      JOIN STORY_MEDIA sm
        ON sm.STORY_ID = s.STORY_ID
      WHERE s.USER_ID = :userId
        AND sm.MEDIA_ID = (
          SELECT MIN(sm3.MEDIA_ID)
          FROM STORY_MEDIA sm3
          WHERE sm3.STORY_ID = s.STORY_ID
        )
      ORDER BY s.CREATED_AT DESC
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
      `,
      { userId, offset, limit },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const cntRes = await conn.execute(
      `
      SELECT COUNT(*) AS "cnt"
      FROM STORIES
      WHERE USER_ID = :userId
      `,
      { userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const total = Number((cntRes.rows?.[0] as any)?.cnt ?? 0);
    const items = (result.rows ?? []) as any[];

    return {
      items,
      hasMore: offset + items.length < total,
    };
  } finally {
    try {
      await conn.close();
    } catch {}
  }
}

/**
 * ✅ 스토리 상세 조회 (모달용)
 * 반환: { storyId, userId, content, emotionScore, createdAt, media:[...] } | null
 */
export async function getStoryDetail(storyId: number) {
  const conn = await getOracleConnection();

  try {
    const storyRes = await conn.execute(
      `
      SELECT
        STORY_ID      AS "storyId",
        USER_ID       AS "userId",
        CONTENT       AS "content",
        EMOTION_SCORE AS "emotionScore",
        CREATED_AT    AS "createdAt"
      FROM STORIES
      WHERE STORY_ID = :storyId
      `,
      { storyId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    const story = (storyRes.rows?.[0] as any) || null;
    if (!story) return null;

    const mediaRes = await conn.execute(
      `
      SELECT
        MEDIA_ID   AS "mediaId",
        STORY_ID   AS "storyId",
        MEDIA_URL  AS "mediaUrl",
        MEDIA_TYPE AS "mediaType",
        CREATED_AT AS "createdAt"
      FROM STORY_MEDIA
      WHERE STORY_ID = :storyId
      ORDER BY MEDIA_ID ASC
      `,
      { storyId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return {
      ...story,
      media: (mediaRes.rows ?? []) as any[],
    };
  } finally {
    try {
      await conn.close();
    } catch {}
  }
}

/**
 * ✅ 스토리 삭제
 */
export async function deleteStory(storyId: number) {
  const conn = await getOracleConnection();

  try {
    const r = await conn.execute(
      `DELETE FROM STORIES WHERE STORY_ID = :storyId`,
      { storyId },
      { autoCommit: true }
    );

    return r.rowsAffected ?? 0;
  } finally {
    try {
      await conn.close();
    } catch {}
  }
}
