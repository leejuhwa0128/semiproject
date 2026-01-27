import { getOracleConnection } from "../config/oracle";

export type ToggleLikeResult = {
  liked: boolean;
  likeCount: number;
};

/**
 * 스토리 좋아요 존재 여부 확인
 */
export const existsStoryLike = async (
  storyId: number,
  userId: number
): Promise<boolean> => {
  const conn = await getOracleConnection();

  const result = await conn.execute<{ CNT: number }>(
    `
    SELECT COUNT(*) AS CNT
    FROM STORIES_LIKES
    WHERE STORY_ID = :storyId
      AND USER_ID = :userId
    `,
    { storyId, userId }
  );

  await conn.close();
  return (result.rows?.[0]?.CNT ?? 0) > 0;
};

/**
 * 스토리 좋아요 추가
 */
export const insertStoryLike = async (
  storyId: number,
  userId: number
): Promise<void> => {
  const conn = await getOracleConnection();

  await conn.execute(
    `
    INSERT INTO STORIES_LIKES (
      LIKE_ID,
      STORY_ID,
      USER_ID
    ) VALUES (
      STORIES_LIKES_SEQ.NEXTVAL,
      :storyId,
      :userId
    )
    `,
    { storyId, userId },
    { autoCommit: true }
  );

  await conn.close();
};

/**
 * 스토리 좋아요 삭제
 */
export const deleteStoryLike = async (
  storyId: number,
  userId: number
): Promise<void> => {
  const conn = await getOracleConnection();

  await conn.execute(
    `
    DELETE FROM STORIES_LIKES
    WHERE STORY_ID = :storyId
      AND USER_ID = :userId
    `,
    { storyId, userId },
    { autoCommit: true }
  );

  await conn.close();
};

/**
 * 스토리 좋아요 개수
 */
export const countStoryLikes = async (
  storyId: number
): Promise<number> => {
  const conn = await getOracleConnection();

  const result = await conn.execute<{ CNT: number }>(
    `
    SELECT COUNT(*) AS CNT
    FROM STORIES_LIKES
    WHERE STORY_ID = :storyId
    `,
    { storyId }
  );

  await conn.close();
  return result.rows?.[0]?.CNT ?? 0;
};

/**
 * ✅ 스토리 좋아요 토글 (라우터용 메인 함수)
 * 게시글 togglePostLike 와 동일한 역할
 */
export const toggleStoryLike = async (
  storyId: number,
  userId: number
): Promise<ToggleLikeResult> => {
  const exists = await existsStoryLike(storyId, userId);

  if (exists) {
    await deleteStoryLike(storyId, userId);
  } else {
    await insertStoryLike(storyId, userId);
  }

  const likeCount = await countStoryLikes(storyId);

  return {
    liked: !exists,
    likeCount,
  };
};
