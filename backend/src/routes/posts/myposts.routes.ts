import { Router } from "express";
import { authMiddleware, AuthRequest } from "../../middleware/auth";
import { countMyPostMedia, findMyPostMedia } from "../../data/myposts.db";
import { findMyPostDetail } from "../../data/posts.detail.db";
import { togglePostLike } from "../../data/likes.db";
import { createComment, listPostComments } from "../../data/comments.db";
import { findPostLikers } from "../../data/postlikes.users.db";
import { softDeleteComment } from "../../data/comments.db";

const router = Router();

/**
 * GET /api/posts/my-media?offset=0&limit=3
 * 내 게시글의 대표 이미지(POST_ID별 1장)만 페이징 조회
 */
router.get("/my-media", authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user!.userId;

  const offset = Number(req.query.offset ?? 0);
  const limit = Number(req.query.limit ?? 3);

  if (Number.isNaN(offset) || Number.isNaN(limit) || limit <= 0) {
    return res
      .status(400)
      .json({ message: "offset/limit 값이 올바르지 않습니다." });
  }

  try {
    const [items, total] = await Promise.all([
      findMyPostMedia(userId, offset, limit),
      countMyPostMedia(userId),
    ]);

    return res.json({
      items,
      total,
      offset,
      limit,
      hasMore: offset + items.length < total,
    });
  } catch (err) {
    console.error("📌 내 미디어 조회 오류:", err);
    return res.status(500).json({ message: "서버 오류" });
  }
});

/**
 * 게시글 상세(모달용)
 * GET /api/posts/:postId
 * - 내 게시글만 조회 가능
 */
router.get("/:postId", authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const postId = Number(req.params.postId);

  if (Number.isNaN(postId)) {
    return res.status(400).json({ message: "postId가 올바르지 않습니다." });
  }

  try {
    const detail = await findMyPostDetail(userId, postId);
    if (!detail) {
      return res.status(404).json({ message: "게시글을 찾을 수 없습니다." });
    }

    return res.json(detail);
  } catch (err) {
    console.error("📌 게시글 상세 조회 오류:", err);
    return res.status(500).json({ message: "서버 오류" });
  }
});

/**
 * ✅ 좋아요 토글
 * POST /api/posts/:postId/like
 */
router.post("/:postId/like", authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const postId = Number(req.params.postId);

  if (Number.isNaN(postId)) {
    return res.status(400).json({ message: "postId가 올바르지 않습니다." });
  }

  try {
    const result = await togglePostLike(postId, userId);
    return res.json(result); // { isLiked, likeCount }
  } catch (err: any) {
    console.error("📌 좋아요 토글 오류:", err);
    return res.status(500).json({ message: "서버 오류" });
  }
});

/**
 * GET /api/posts/:postId/comments
 */
router.get("/:postId/comments", authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const postId = Number(req.params.postId);

  if (Number.isNaN(postId)) {
    return res.status(400).json({ message: "postId가 올바르지 않습니다." });
  }

  try {
    const items = await listPostComments(postId, userId);
    return res.json({ items });
  } catch (err) {
    console.error("📌 댓글 조회 오류:", err);
    return res.status(500).json({ message: "서버 오류" });
  }
});

/**
 * POST /api/posts/:postId/comments
 * body: { content: string, parentCommentId?: number|null }
 */
router.post("/:postId/comments", authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const postId = Number(req.params.postId);

  const content = String(req.body?.content ?? "").trim();
  const parentCommentIdRaw = req.body?.parentCommentId;
  const parentCommentId =
    parentCommentIdRaw === null || parentCommentIdRaw === undefined
      ? null
      : Number(parentCommentIdRaw);

  if (Number.isNaN(postId)) {
    return res.status(400).json({ message: "postId가 올바르지 않습니다." });
  }
  if (!content) {
    return res.status(400).json({ message: "댓글 내용을 입력하세요." });
  }
  if (parentCommentId !== null && Number.isNaN(parentCommentId)) {
    return res.status(400).json({ message: "parentCommentId가 올바르지 않습니다." });
  }

  try {
    const created = await createComment({ postId, userId, content, parentCommentId });
    return res.json(created);
  } catch (err) {
    console.error("📌 댓글 작성 오류:", err);
    return res.status(500).json({ message: "서버 오류" });
  }
});

/**
 * GET /api/posts/:postId/likes/users?limit=50&offset=0
 */
router.get("/:postId/likes/users", authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const postId = Number(req.params.postId);
  const limit = Number(req.query.limit ?? 50);
  const offset = Number(req.query.offset ?? 0);

  if (Number.isNaN(postId)) return res.status(400).json({ message: "postId가 올바르지 않습니다." });
  if (Number.isNaN(limit) || limit <= 0) return res.status(400).json({ message: "limit이 올바르지 않습니다." });
  if (Number.isNaN(offset) || offset < 0) return res.status(400).json({ message: "offset이 올바르지 않습니다." });

  try {
    const items = await findPostLikers({ postId, viewerUserId: userId, limit, offset });
    return res.json({ items });
  } catch (err) {
    console.error("📌 좋아요 유저 목록 오류:", err);
    return res.status(500).json({ message: "서버 오류" });
  }
});

// ✅ 댓글 삭제
// DELETE /api/posts/:postId/comments/:commentId
router.delete("/:postId/comments/:commentId", authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const postId = Number(req.params.postId);
  const commentId = Number(req.params.commentId);

  if (Number.isNaN(postId) || Number.isNaN(commentId)) {
    return res.status(400).json({ message: "postId/commentId가 올바르지 않습니다." });
  }

  try {
    // ✅ 안전장치: 이 댓글이 해당 postId에 속하는지 확인하고 싶으면
    // softDeleteComment 쿼리에서 post_id까지 조건에 추가해도 됨.
    const result = await softDeleteComment({ commentId, userId });

    if (!result.ok) return res.status(403).json({ message: result.message });
    return res.json({ ok: true });
  } catch (err) {
    console.error("📌 댓글 삭제 오류:", err);
    return res.status(500).json({ message: "서버 오류" });
  }
});

/**
 * GET /api/posts/my-media
 */
router.get("/my-media", authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const offset = Number(req.query.offset ?? 0);
  const limit = Number(req.query.limit ?? 3);

  const items = await findMyPostMedia(userId, offset, limit);
  const total = await countMyPostMedia(userId);

  res.json({
    items,
    total,
    offset,
    limit,
    hasMore: offset + items.length < total,
  });
});

export default router;