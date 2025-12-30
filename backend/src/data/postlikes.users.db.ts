import oracledb from "oracledb";
import { getOracleConnection } from "../config/oracle"; // ✅ 너 프로젝트 경로에 맞게 조정

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
  const conn = await getOracleConnection();
  try {
    const r = await conn.execute<any>(
      `
      SELECT
        u.user_id AS "userId",
        u.nickname AS "nickname",
        u.login_id AS "loginId",
        u.profile_image_url AS "profileImageUrl",
        CASE WHEN f.follower_id IS NULL THEN 0 ELSE 1 END AS "isFollowing"
      FROM post_likes pl
      JOIN users u ON u.user_id = pl.user_id
      LEFT JOIN follows f
        ON f.follower_id = :viewerUserId
       AND f.followee_id = u.user_id
      WHERE pl.post_id = :postId
      ORDER BY pl.created_at DESC
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
      `,
      {
        postId: params.postId,
        viewerUserId: params.viewerUserId,
        offset: params.offset,
        limit: params.limit,
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return (r.rows ?? []).map((x: any) => ({
      ...x,
      isFollowing: x.isFollowing === 1,
    }));
  } finally {
    try {
      await conn.close();
    } catch {}
  }
}
