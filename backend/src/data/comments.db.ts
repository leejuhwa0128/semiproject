import oracledb from "oracledb";
import { getOracleConnection } from "../config/oracle";

const toIso = (v: any) => {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return d.toISOString();
};

export async function createComment(params: {
  postId: number;
  userId: number;
  content: string;
  parentCommentId?: number | null;
}) {
  let conn;
  try {
    conn = await getOracleConnection();

    const postId = Number(params.postId);
    const userId = Number(params.userId);
    const content = String(params.content ?? "").trim();
    const parentCommentId =
      params.parentCommentId === undefined || params.parentCommentId === null
        ? null
        : Number(params.parentCommentId);

    if (!content) throw new Error("EMPTY_CONTENT");
    if (!Number.isFinite(postId) || !Number.isFinite(userId)) throw new Error("BAD_ID");
    if (parentCommentId !== null && !Number.isFinite(parentCommentId)) throw new Error("BAD_PARENT");

    const insertSql = `
      INSERT INTO comments (
        post_id, user_id, parent_comment_id, content, is_deleted, created_at
      )
      VALUES (
        :postId, :userId, :parentCommentId, :content, 'N', SYSTIMESTAMP
      )
      RETURNING comment_id INTO :commentId
    `;

    const r = await conn.execute(
      insertSql,
      {
        postId,
        userId,
        parentCommentId,
        content,
        commentId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: false }
    );

    const commentId = Number((r.outBinds as any).commentId[0]);

    // ✅ 바로 조회해서 프론트에 필요한 형태로 리턴
    const selectSql = `
      SELECT
        c.comment_id        AS "commentId",
        c.user_id           AS "userId",
        u.nickname          AS "nickname",
        u.profile_image_url AS "profileImageUrl",
        c.content           AS "content",
        c.created_at        AS "createdAt",
        c.parent_comment_id AS "parentCommentId",
        c.is_deleted        AS "isDeleted"
      FROM comments c
      JOIN users u ON u.user_id = c.user_id
      WHERE c.comment_id = :commentId
    `;

    const s = await conn.execute(
      selectSql,
      { commentId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    await conn.commit();

    const row = (s.rows?.[0] as any) ?? null;
    if (!row) return { commentId }; // 혹시라도 조회 실패하면 최소값 반환

    return {
      commentId: Number(row.commentId),
      userId: Number(row.userId),
      nickname: String(row.nickname),
      profileImageUrl: row.profileImageUrl ?? null,
      content: String(row.content ?? ""),
      createdAt: toIso(row.createdAt)!,
      parentCommentId: row.parentCommentId == null ? null : Number(row.parentCommentId),
      isDeleted: row.isDeleted === "Y",
    };
  } catch (e) {
    try {
      await conn?.rollback();
    } catch { }
    throw e;
  } finally {
    try {
      await conn?.close();
    } catch { }
  }
}

export interface CommentRow {
  commentId: number;
  userId: number;
  nickname: string;
  profileImageUrl: string | null;
  content: string;
  createdAt: String;
  parentCommentId: number | null;
  isDeleted: boolean; // 0/1
  // 확장용
  // likeCount?: number;
  // isLiked?: boolean;
}

/**
 * 게시글 댓글 목록 조회
 * - 작성자 정보 포함
 * - parentCommentId 포함 (대댓글 트리 구성 가능)
 * - 삭제 댓글 마스킹 처리
 */
export async function listPostComments(
  postId: number,
  viewerUserId: number,
  opts?: {
    order?: "asc" | "desc";
    limit?: number;
    offset?: number;
  }
): Promise<CommentRow[]> {
  let conn;
  try {
    conn = await getOracleConnection();

    const order = (opts?.order ?? "asc").toLowerCase() === "desc" ? "DESC" : "ASC";
    const limit = Number(opts?.limit ?? 200);
    const offset = Number(opts?.offset ?? 0);

    const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 200;
    const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0;

    const sql = `
      SELECT
        c.comment_id        AS "commentId",
        c.user_id           AS "userId",
        u.nickname          AS "nickname",
        u.profile_image_url AS "profileImageUrl",
        CASE
          WHEN c.is_deleted = 'Y' THEN '삭제된 댓글입니다.'
          ELSE c.content
        END                 AS "content",
        c.created_at        AS "createdAt",
        c.parent_comment_id AS "parentCommentId",
        c.is_deleted        AS "isDeleted"
      FROM comments c
      JOIN users u ON u.user_id = c.user_id
      WHERE c.post_id = :postId 
      AND c.is_deleted = 'N'
      ORDER BY c.created_at ${order}, c.comment_id ${order}
      OFFSET :offset ROWS FETCH NEXT :limit ROWS ONLY
    `;

    const r = await conn.execute(
      sql,
      { postId, offset: safeOffset, limit: safeLimit },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return ((r.rows as any[]) ?? []).map((row) => ({
      commentId: Number(row.commentId),
      userId: Number(row.userId),
      nickname: String(row.nickname),
      profileImageUrl: row.profileImageUrl ?? null,
      content: String(row.content ?? ""),
      createdAt: toIso(row.createdAt)!,
      parentCommentId: row.parentCommentId == null ? null : Number(row.parentCommentId),

      // ✅ 'Y'/'N' 유지하거나 boolean으로 바꿔도 됨
      isDeleted: row.isDeleted === "Y",
    }));
  } finally {
    try {
      if (conn) await conn.close();
    } catch { }
  }
}

/** ✅ 댓글 삭제(소프트 삭제) */
export async function softDeleteComment(params: {
  commentId: number;
  userId: number; // 삭제 요청자(댓글 작성자)
}) {
  const conn = await getOracleConnection();
  try {
    const commentId = Number(params.commentId);
    const userId = Number(params.userId);

    if (Number.isNaN(commentId) || Number.isNaN(userId)) throw new Error("BAD_ID");

    // ✅ 본인 댓글만 삭제 가능
    const sql = `
      UPDATE comments
      SET is_deleted = 'Y'
      WHERE comment_id = :commentId
        AND user_id = :userId
        AND is_deleted = 'N'
    `;

    const r = await conn.execute(sql, { commentId, userId }, { autoCommit: false });

    const rows = Number(r.rowsAffected ?? 0);
    if (rows === 0) {
      // 이미 삭제됐거나, 내 댓글이 아님
      return { ok: false, message: "삭제할 수 없습니다." };
    }

    await conn.commit();
    return { ok: true };
  } catch (e) {
    try { await conn.rollback(); } catch {}
    throw e;
  } finally {
    try { await conn.close(); } catch {}
  }
}