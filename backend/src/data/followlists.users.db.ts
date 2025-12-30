import oracledb from "oracledb";
import { getOracleConnection } from "../config/oracle";

export interface FollowUserItem {
  userId: number;
  nickname: string;
  loginId?: string;
  profileImageUrl: string | null;
  isFollowing: boolean; // viewer 기준
}

export async function findFollowers(params: {
  targetUserId: number;
  viewerUserId: number;
  offset: number;
  limit: number;
}): Promise<FollowUserItem[]> {
  const conn = await getOracleConnection();
  try {
    const r = await conn.execute<any>(
      `
      SELECT
        u.user_id AS "userId",
        u.nickname AS "nickname",
        u.login_id AS "loginId",
        u.profile_image_url AS "profileImageUrl",
        CASE WHEN vf.follow_id IS NULL THEN 0 ELSE 1 END AS "isFollowing"
      FROM follow f
      JOIN users u ON u.user_id = f.follower_id
      LEFT JOIN follow vf
        ON vf.follower_id = :viewerUserId
       AND vf.following_id = u.user_id
      WHERE f.following_id = :targetUserId
      ORDER BY f.created_at DESC, f.follow_id DESC
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
      `,
      {
        targetUserId: params.targetUserId,
        viewerUserId: params.viewerUserId,
        offset: params.offset,
        limit: params.limit,
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return (r.rows ?? []).map((x: any) => ({
      userId: Number(x.userId),
      nickname: String(x.nickname ?? ""),
      loginId: x.loginId ?? undefined,
      profileImageUrl: x.profileImageUrl ?? null,
      isFollowing: x.isFollowing === 1,
    }));
  } finally {
    try {
      await conn.close();
    } catch {}
  }
}

export async function findFollowing(params: {
  targetUserId: number;
  viewerUserId: number;
  offset: number;
  limit: number;
}): Promise<FollowUserItem[]> {
  const conn = await getOracleConnection();
  try {
    const r = await conn.execute<any>(
      `
      SELECT
        u.user_id AS "userId",
        u.nickname AS "nickname",
        u.login_id AS "loginId",
        u.profile_image_url AS "profileImageUrl",
        CASE WHEN vf.follow_id IS NULL THEN 0 ELSE 1 END AS "isFollowing"
      FROM follow f
      JOIN users u ON u.user_id = f.following_id
      LEFT JOIN follow vf
        ON vf.follower_id = :viewerUserId
       AND vf.following_id = u.user_id
      WHERE f.follower_id = :targetUserId
      ORDER BY f.created_at DESC, f.follow_id DESC
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
      `,
      {
        targetUserId: params.targetUserId,
        viewerUserId: params.viewerUserId,
        offset: params.offset,
        limit: params.limit,
      },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return (r.rows ?? []).map((x: any) => ({
      userId: Number(x.userId),
      nickname: String(x.nickname ?? ""),
      loginId: x.loginId ?? undefined,
      profileImageUrl: x.profileImageUrl ?? null,
      isFollowing: x.isFollowing === 1,
    }));
  } finally {
    try {
      await conn.close();
    } catch {}
  }
}

export async function countFollowers(targetUserId: number): Promise<number> {
  const conn = await getOracleConnection();
  try {
    const r = await conn.execute<any>(
      `SELECT COUNT(*) AS "cnt" FROM follow WHERE following_id = :targetUserId`,
      { targetUserId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return Number(r.rows?.[0]?.cnt ?? 0);
  } finally {
    try {
      await conn.close();
    } catch {}
  }
}

export async function countFollowing(targetUserId: number): Promise<number> {
  const conn = await getOracleConnection();
  try {
    const r = await conn.execute<any>(
      `SELECT COUNT(*) AS "cnt" FROM follow WHERE follower_id = :targetUserId`,
      { targetUserId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    return Number(r.rows?.[0]?.cnt ?? 0);
  } finally {
    try {
      await conn.close();
    } catch {}
  }
}
