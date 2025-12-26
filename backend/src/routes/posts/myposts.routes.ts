import { Router } from "express";
import { authMiddleware, AuthRequest } from "../../middleware/auth";
import { countMyPostMedia, findMyPostMedia } from "../../data/myposts.db";
import { findMyPostDetail } from "../../data/posts.detail.db";
import { togglePostLike } from "../../data/likes.db";

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

export default router;
