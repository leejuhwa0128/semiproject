import { Router } from "express";
import { authMiddleware, AuthRequest } from "../../middleware/auth";
import { getOracleConnection } from "../../config/oracle"; // ✅ 너 프로젝트 경로에 맞게 조정
import oracledb from "oracledb";

const router = Router();

// ---------------------------------------------
// 타입
// ---------------------------------------------
export interface CommentItem {
  commentId: number;
  postId: number;
  userId: number;
  nickname: string;
  profileImageUrl: string | null;
  content: string;
  createdAt: string;
  updatedAt: string | null;
  parentCommentId: number | null;
  likeCount: number;
  isLiked: boolean;
  isDeleted: boolean;
}

// ---------------------------------------------
// 내부 DB 함수들(요청대로 2,3,4를 한 파일에 넣음)
// ---------------------------------------------
async function listComments(postId: number, viewerUserId: number): Promise<CommentItem[]> {
  const conn = await getOracleConnection();
  try {
    const r = await conn.execute<any>(
      `
      SELECT
        c.comment_id AS "commentId",
        c.post_id AS "postId",
        c.user_id AS "userId",
        u.nickname AS "nickname",
        u.profile_image_url AS "profileImageUrl",
        CASE
          WHEN c.is_deleted = 1 THEN '[삭제된 댓글입니다]'
          ELSE c.content
        END AS "content",
        TO_CHAR(c.created_at, 'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM') AS "createdAt",
        CASE WHEN c.updated_at IS NULL THEN NULL
             ELSE TO_CHAR(c.updated_at, 'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM')
        END AS "updatedAt",
        c.parent_comment_id AS "parentCommentId",
        (SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.comment_id) AS "likeCount",
        CASE WHEN EXISTS (
          SELECT 1 FROM comment_likes cl
          WHERE cl.comment_id = c.comment_id AND cl.user_id = :viewerUserId
        ) THEN 1 ELSE 0 END AS "isLiked",
        c.is_deleted AS "isDeleted"
      FROM comments c
      JOIN users u ON u.user_id = c.user_id
      WHERE c.post_id = :postId
      ORDER BY NVL(c.parent_comment_id, c.comment_id), c.created_at
      `,
      { postId, viewerUserId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    return (r.rows ?? []).map((row: any) => ({
      ...row,
      isLiked: row.isLiked === 1,
      isDeleted: row.isDeleted === 1,
      likeCount: Number(row.likeCount ?? 0),
    }));
  } finally {
    try {
      await conn.close();
    } catch {}
  }
}

async function createComment(params: {
  postId: number;
  userId: number;
  content: string;
  parentCommentId?: number | null;
}): Promise<CommentItem> {
  const conn = await getOracleConnection();
  try {
    // 부모댓글 존재 확인(있으면 같은 post인지 확인)
    if (params.parentCommentId) {
      const p = await conn.execute<any>(
        `SELECT post_id AS "postId" FROM comments WHERE comment_id = :cid`,
        { cid: params.parentCommentId },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      if (!p.rows?.length) throw new Error("PARENT_NOT_FOUND");
      if (Number(p.rows[0].postId) !== params.postId) throw new Error("PARENT_POST_MISMATCH");
    }

    // insert + returning
    const ins = await conn.execute<any>(
      `
      INSERT INTO comments (post_id, user_id, parent_comment_id, content, is_deleted, created_at)
      VALUES (:postId, :userId, :parentCommentId, :content, 0, SYSTIMESTAMP)
      RETURNING comment_id INTO :commentId
      `,
      {
        postId: params.postId,
        userId: params.userId,
        parentCommentId: params.parentCommentId ?? null,
        content: params.content,
        commentId: { dir: oracledb.BIND_OUT, type: oracledb.NUMBER },
      },
      { autoCommit: false }
    );

    const commentId = Number(ins.outBinds.commentId[0]);

    // 방금 생성한 댓글 조회해서 리턴(닉네임/프로필 포함)
    const r = await conn.execute<any>(
      `
      SELECT
        c.comment_id AS "commentId",
        c.post_id AS "postId",
        c.user_id AS "userId",
        u.nickname AS "nickname",
        u.profile_image_url AS "profileImageUrl",
        c.content AS "content",
        TO_CHAR(c.created_at, 'YYYY-MM-DD"T"HH24:MI:SS.FF3TZH:TZM') AS "createdAt",
        NULL AS "updatedAt",
        c.parent_comment_id AS "parentCommentId",
        0 AS "likeCount",
        0 AS "isLiked",
        c.is_deleted AS "isDeleted"
      FROM comments c
      JOIN users u ON u.user_id = c.user_id
      WHERE c.comment_id = :commentId
      `,
      { commentId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    await conn.commit();

    const row = r.rows?.[0];
    return {
      ...row,
      isLiked: false,
      isDeleted: row.isDeleted === 1,
      likeCount: 0,
    } as CommentItem;
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

async function updateComment(commentId: number, userId: number, content: string) {
  const conn = await getOracleConnection();
  try {
    // 권한 체크(작성자만)
    const chk = await conn.execute<any>(
      `SELECT user_id AS "userId", is_deleted AS "isDeleted"
         FROM comments
        WHERE comment_id = :commentId`,
      { commentId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (!chk.rows?.length) throw new Error("NOT_FOUND");
    if (Number(chk.rows[0].userId) !== userId) throw new Error("FORBIDDEN");
    if (Number(chk.rows[0].isDeleted) === 1) throw new Error("DELETED");

    await conn.execute(
      `UPDATE comments
          SET content = :content,
              updated_at = SYSTIMESTAMP
        WHERE comment_id = :commentId`,
      { content, commentId },
      { autoCommit: false }
    );
    await conn.commit();
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

async function softDeleteComment(commentId: number, userId: number) {
  const conn = await getOracleConnection();
  try {
    const chk = await conn.execute<any>(
      `SELECT user_id AS "userId"
         FROM comments
        WHERE comment_id = :commentId`,
      { commentId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (!chk.rows?.length) throw new Error("NOT_FOUND");
    if (Number(chk.rows[0].userId) !== userId) throw new Error("FORBIDDEN");

    await conn.execute(
      `UPDATE comments
          SET is_deleted = 1,
              content = '[삭제된 댓글입니다]',
              updated_at = SYSTIMESTAMP
        WHERE comment_id = :commentId`,
      { commentId },
      { autoCommit: false }
    );
    await conn.commit();
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

async function toggleCommentLike(commentId: number, userId: number) {
  const conn = await getOracleConnection();
  try {
    // exists?
    const check = await conn.execute<any>(
      `SELECT 1 AS ok
         FROM comment_likes
        WHERE comment_id = :commentId
          AND user_id = :userId`,
      { commentId, userId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    const liked = (check.rows?.length ?? 0) > 0;

    if (liked) {
      await conn.execute(
        `DELETE FROM comment_likes
          WHERE comment_id = :commentId
            AND user_id = :userId`,
        { commentId, userId },
        { autoCommit: false }
      );
    } else {
      await conn.execute(
        `INSERT INTO comment_likes (comment_id, user_id, created_at)
         VALUES (:commentId, :userId, SYSTIMESTAMP)`,
        { commentId, userId },
        { autoCommit: false }
      );
    }

    const cnt = await conn.execute<any>(
      `SELECT COUNT(*) AS "likeCount"
         FROM comment_likes
        WHERE comment_id = :commentId`,
      { commentId },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );

    await conn.commit();
    return {
      isLiked: !liked,
      likeCount: Number(cnt.rows?.[0]?.likeCount ?? 0),
    };
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

// ---------------------------------------------
// 라우트
// ---------------------------------------------

/**
 * GET /api/posts/:postId/comments
 */
router.get("/posts/:postId/comments", authMiddleware, async (req: AuthRequest, res) => {
  const viewerUserId = req.user!.userId;
  const postId = Number(req.params.postId);
  if (Number.isNaN(postId)) return res.status(400).json({ message: "postId가 올바르지 않습니다." });

  try {
    const items = await listComments(postId, viewerUserId);
    return res.json({ items });
  } catch (err) {
    console.error("📌 댓글 목록 조회 오류:", err);
    return res.status(500).json({ message: "서버 오류" });
  }
});

/**
 * POST /api/posts/:postId/comments
 * body: { content: string, parentCommentId?: number }
 */
router.post("/posts/:postId/comments", authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const postId = Number(req.params.postId);
  const content = String(req.body?.content ?? "").trim();
  const parentCommentIdRaw = req.body?.parentCommentId;
  const parentCommentId =
    parentCommentIdRaw == null || parentCommentIdRaw === ""
      ? null
      : Number(parentCommentIdRaw);

  if (Number.isNaN(postId)) return res.status(400).json({ message: "postId가 올바르지 않습니다." });
  if (!content) return res.status(400).json({ message: "content가 비어있습니다." });
  if (content.length > 2000) return res.status(400).json({ message: "content가 너무 깁니다." });
  if (parentCommentId != null && Number.isNaN(parentCommentId)) {
    return res.status(400).json({ message: "parentCommentId가 올바르지 않습니다." });
  }

  try {
    const created = await createComment({
      postId,
      userId,
      content,
      parentCommentId,
    });
    return res.json(created);
  } catch (err: any) {
    console.error("📌 댓글 작성 오류:", err);
    if (String(err?.message) === "PARENT_NOT_FOUND") {
      return res.status(404).json({ message: "부모 댓글을 찾을 수 없습니다." });
    }
    if (String(err?.message) === "PARENT_POST_MISMATCH") {
      return res.status(400).json({ message: "부모 댓글과 게시글이 일치하지 않습니다." });
    }
    return res.status(500).json({ message: "서버 오류" });
  }
});

/**
 * PATCH /api/comments/:commentId
 * body: { content: string }
 */
router.patch("/comments/:commentId", authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const commentId = Number(req.params.commentId);
  const content = String(req.body?.content ?? "").trim();

  if (Number.isNaN(commentId)) return res.status(400).json({ message: "commentId가 올바르지 않습니다." });
  if (!content) return res.status(400).json({ message: "content가 비어있습니다." });

  try {
    await updateComment(commentId, userId, content);
    return res.json({ ok: true });
  } catch (err: any) {
    console.error("📌 댓글 수정 오류:", err);
    if (String(err?.message) === "NOT_FOUND") return res.status(404).json({ message: "댓글을 찾을 수 없습니다." });
    if (String(err?.message) === "FORBIDDEN") return res.status(403).json({ message: "권한이 없습니다." });
    if (String(err?.message) === "DELETED") return res.status(400).json({ message: "삭제된 댓글은 수정할 수 없습니다." });
    return res.status(500).json({ message: "서버 오류" });
  }
});

/**
 * DELETE /api/comments/:commentId
 * (소프트 삭제)
 */
router.delete("/comments/:commentId", authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const commentId = Number(req.params.commentId);

  if (Number.isNaN(commentId)) return res.status(400).json({ message: "commentId가 올바르지 않습니다." });

  try {
    await softDeleteComment(commentId, userId);
    return res.json({ ok: true });
  } catch (err: any) {
    console.error("📌 댓글 삭제 오류:", err);
    if (String(err?.message) === "NOT_FOUND") return res.status(404).json({ message: "댓글을 찾을 수 없습니다." });
    if (String(err?.message) === "FORBIDDEN") return res.status(403).json({ message: "권한이 없습니다." });
    return res.status(500).json({ message: "서버 오류" });
  }
});

/**
 * POST /api/comments/:commentId/like
 * 응답: { isLiked, likeCount }
 */
router.post("/comments/:commentId/like", authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const commentId = Number(req.params.commentId);

  if (Number.isNaN(commentId)) return res.status(400).json({ message: "commentId가 올바르지 않습니다." });

  try {
    const result = await toggleCommentLike(commentId, userId);
    return res.json(result);
  } catch (err) {
    console.error("📌 댓글 좋아요 토글 오류:", err);
    return res.status(500).json({ message: "서버 오류" });
  }
});

export default router;
