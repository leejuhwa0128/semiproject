// src/data/posts.detail.db.ts
import { getOracleConnection } from "../config/oracle";

export interface PostDetailMedia {
  mediaId: number;
  mediaUrl: string;
  mediaType: string | null;
  createdAt: string; // ✅ Date -> string
}

// ✅ 최신 좋아요 1명 정보 타입
export interface LatestLiker {
  userId: number;
  nickname: string;
  profileImageUrl: string | null;
}

export interface PostDetail {
  postId: number;
  userId: number;
  nickname: string;
  profileImageUrl: string | null;
  content: string;
  createdAt: string; // ✅ Date -> string
  media: PostDetailMedia[];
  likeCount: number;
  isLiked: boolean;

  latestLiker: LatestLiker | null;
}

const toIso = (v: any) => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return d.toISOString();
};

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
    const mediaRows = (mediaRes.rows as any[]) ?? [];

    // ✅ media도 createdAt을 string으로 변환해서 반환
    const media: PostDetailMedia[] = mediaRows.map((m) => ({
      mediaId: Number(m.mediaId),
      mediaUrl: String(m.mediaUrl),
      mediaType: m.mediaType ?? null,
      createdAt: toIso(m.createdAt)!,
    }));

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

    // ✅ 최신 좋아요 1명 (없으면 null)
    const latestLikerSql = `
      SELECT
        u.user_id AS "userId",
        u.nickname AS "nickname",
        u.profile_image_url AS "profileImageUrl"
      FROM post_likes pl
      JOIN users u ON u.user_id = pl.user_id
      WHERE pl.post_id = :postId
      ORDER BY pl.created_at DESC
      FETCH FIRST 1 ROWS ONLY
    `;
    const latestRes = await conn.execute(latestLikerSql, { postId }, { outFormat: 4002 });
    const latestRow =
      latestRes.rows && latestRes.rows.length > 0 ? (latestRes.rows[0] as any) : null;

    const latestLiker: LatestLiker | null = latestRow
      ? {
          userId: Number(latestRow.userId),
          nickname: String(latestRow.nickname),
          profileImageUrl: latestRow.profileImageUrl ?? null,
        }
      : null;

    return {
      postId: Number(post.postId),
      userId: Number(post.userId),
      nickname: String(post.nickname),
      profileImageUrl: post.profileImageUrl ?? null,
      content: post.content ?? "",
      createdAt: toIso(post.createdAt) ?? "", // ✅ string으로
      media,
      likeCount,
      isLiked,
      latestLiker,
    };
  } finally {
    try {
      if (conn) await conn.close();
    } catch {}
  }
}

/**
 * ✅ 전체 게시글 상세(모달용)
 * - postId로 POSTS + USERS + POST_MEDIA 조회 (작성자 제한 없음)
 * - viewerUserId로 isLiked 계산
 */
export async function findPostDetail(
  viewerUserId: number,
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
    `;

    const postRes = await conn.execute(
      postSql,
      { postId },
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
    const mediaRows = (mediaRes.rows as any[]) ?? [];
    const media: PostDetailMedia[] = mediaRows.map((m) => ({
      mediaId: Number(m.mediaId),
      mediaUrl: String(m.mediaUrl),
      mediaType: m.mediaType ?? null,
      createdAt: toIso(m.createdAt)!,
    }));

    // ✅ 좋아요 count
    const likeCountSql = `
      SELECT COUNT(*) AS "cnt"
      FROM post_likes
      WHERE post_id = :postId
    `;
    const likeCountRes = await conn.execute(likeCountSql, { postId }, { outFormat: 4002 });
    const likeCount = Number((likeCountRes.rows?.[0] as any)?.cnt ?? 0);

    // ✅ viewer(나)가 좋아요 했는지
    const isLikedSql = `
      SELECT COUNT(*) AS "cnt"
      FROM post_likes
      WHERE post_id = :postId AND user_id = :viewerUserId
    `;
    const isLikedRes = await conn.execute(
      isLikedSql,
      { postId, viewerUserId },
      { outFormat: 4002 }
    );
    const isLiked = Number((isLikedRes.rows?.[0] as any)?.cnt ?? 0) > 0;

    // ✅ 최신 좋아요 1명
    const latestLikerSql = `
      SELECT
        u.user_id AS "userId",
        u.nickname AS "nickname",
        u.profile_image_url AS "profileImageUrl"
      FROM post_likes pl
      JOIN users u ON u.user_id = pl.user_id
      WHERE pl.post_id = :postId
      ORDER BY pl.created_at DESC
      FETCH FIRST 1 ROWS ONLY
    `;
    const latestRes = await conn.execute(latestLikerSql, { postId }, { outFormat: 4002 });
    const latestRow =
      latestRes.rows && latestRes.rows.length > 0 ? (latestRes.rows[0] as any) : null;

    const latestLiker: LatestLiker | null = latestRow
      ? {
          userId: Number(latestRow.userId),
          nickname: String(latestRow.nickname),
          profileImageUrl: latestRow.profileImageUrl ?? null,
        }
      : null;

    return {
      postId: Number(post.postId),
      userId: Number(post.userId),
      nickname: String(post.nickname),
      profileImageUrl: post.profileImageUrl ?? null,
      content: post.content ?? "",
      createdAt: toIso(post.createdAt) ?? "",
      media,
      likeCount,
      isLiked,
      latestLiker,
    };
  } finally {
    try {
      if (conn) await conn.close();
    } catch {}
  }
}
