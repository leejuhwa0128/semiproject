// 좋아요 누른 사람들 목록 조회 DB 처리
import oracledb from "oracledb";
import { getOracleConnection } from "../config/oracle";

export interface LikerItem {
  userId: number;
  nickname: string;
  loginId?: string;
  profileImageUrl: string | null;
  isFollowing: boolean;
}

export async function findPostLikers(params: {
  postId: number;
  viewerUserId: number;
  offset: number;
  limit: number;
}): Promise<LikerItem[]> {
  let conn;
  try {
    conn = await getOracleConnection();

    const sql = `
      SELECT
        u.user_id           AS "userId",
        u.nickname          AS "nickname",
        u.login_id          AS "loginId",
        u.profile_image_url AS "profileImageUrl",
        CASE
          WHEN f.follower_id IS NULL THEN 0
          ELSE 1
        END AS "isFollowing"
      FROM post_likes pl
      JOIN users u
        ON u.user_id = pl.user_id
      LEFT JOIN follow f
        ON f.follower_id = :viewerUserId
       AND f.following_id = u.user_id   -- ✅ 여기 변경
      WHERE pl.post_id = :postId
      ORDER BY pl.created_at DESC, pl.like_id DESC
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    `;

    const result = await conn.execute<any>(
      sql,
      {
        postId: params.postId,
        viewerUserId: params.viewerUserId,
        offset: params.offset,
        limit: params.limit,
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return (result.rows ?? []).map((row: any) => ({
      userId: Number(row.userId),
      nickname: String(row.nickname),
      loginId: row.loginId ?? undefined,
      profileImageUrl: row.profileImageUrl ?? null,
      isFollowing: row.isFollowing === 1,
    }));
  } finally {
    if (conn) {
      try {
        await conn.close();
      } catch {}
    }
  }
}
