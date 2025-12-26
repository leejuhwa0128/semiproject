// 프로필 게시글 상세

import { getOracleConnection } from "../config/oracle";

export interface PostDetailMedia {
  mediaId: number;
  mediaUrl: string;
  mediaType: string | null;
  createdAt: Date;
}

export interface PostDetail {
  postId: number;
  userId: number;
  nickname: string;
  profileImageUrl: string | null;
  content: string;
  createdAt: Date;
  media: PostDetailMedia[];
  likeCount: number;
  isLiked: boolean;
}

/**
 * ✅ 내 게시글 상세(미디어 여러장 포함)
 * - postId로 POSTS + USERS + POST_MEDIA 조회
 * - media는 MEDIA_ID ASC (대표/순서 안정)
 */
export async function findMyPostDetail(
  userId: number,
  postId: number
): Promise<PostDetail | null> {
  let conn;
  try {
    conn = await getOracleConnection();

    const postSql = `
      SELECT
        p.post_id AS "postId",
        p.user_id AS "userId",
        u.nickname AS "nickname",
        u.profile_image_url AS "profileImageUrl",
        p.content AS "content",
        p.created_at AS "createdAt"
      FROM posts p
      JOIN users u ON u.user_id = p.user_id
      WHERE p.post_id = :postId
        AND p.user_id = :userId
    `;

    const postRes = await conn.execute(
      postSql,
      { postId, userId },
      { outFormat: 4002 }
    );

    if (!postRes.rows || postRes.rows.length === 0) return null;
    const post = postRes.rows[0] as any;

    const mediaSql = `
      SELECT
        pm.media_id AS "mediaId",
        pm.media_url AS "mediaUrl",
        pm.media_type AS "mediaType",
        pm.created_at AS "createdAt"
      FROM post_media pm
      WHERE pm.post_id = :postId
        AND (
          pm.media_type LIKE 'image%'
          OR pm.media_type = 'image'
          OR LOWER(pm.media_url) LIKE '%.jpg'
          OR LOWER(pm.media_url) LIKE '%.jpeg'
          OR LOWER(pm.media_url) LIKE '%.png'
          OR LOWER(pm.media_url) LIKE '%.webp'
          OR LOWER(pm.media_url) LIKE '%.gif'
        )
      ORDER BY pm.media_id ASC
    `;

    const mediaRes = await conn.execute(mediaSql, { postId }, { outFormat: 4002 });
    const media = ((mediaRes.rows as any[]) ?? []) as PostDetailMedia[];

    // ✅ 좋아요 count
    const likeCountSql = `
      SELECT COUNT(*) AS "cnt"
      FROM post_likes
      WHERE post_id = :postId
    `;
    const likeCountRes = await conn.execute(likeCountSql, { postId }, { outFormat: 4002 });
    const likeCount = Number((likeCountRes.rows?.[0] as any)?.cnt ?? 0);

    // ✅ 내가 좋아요 했는지
    const isLikedSql = `
      SELECT COUNT(*) AS "cnt"
      FROM post_likes
      WHERE post_id = :postId AND user_id = :userId
    `;
    const isLikedRes = await conn.execute(isLikedSql, { postId, userId }, { outFormat: 4002 });
    const isLiked = Number((isLikedRes.rows?.[0] as any)?.cnt ?? 0) > 0;

    return {
      postId: post.postId,
      userId: post.userId,
      nickname: post.nickname,
      profileImageUrl: post.profileImageUrl ?? null,
      content: post.content ?? "",
      createdAt: post.createdAt,
      media,
      likeCount,
      isLiked,
    };
  } finally {
    if (conn) await conn.close();
  }
}