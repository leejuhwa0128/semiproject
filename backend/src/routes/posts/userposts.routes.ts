import { Router } from "express";
import { authMiddleware } from "../../middleware/auth";
import { findUserPostMedia, countUserPostMedia } from "../../data/userposts.db";

const router = Router();

/**
 * GET /api/posts/user/:userId/media?offset=0&limit=3
 */
router.get("/user/:userId/media", authMiddleware, async (req, res) => {
  const userId = Number(req.params.userId);
  const offset = Number(req.query.offset ?? 0);
  const limit = Number(req.query.limit ?? 3);

  if (!Number.isFinite(userId)) return res.status(400).json({ message: "userId가 올바르지 않습니다." });
  if (!Number.isFinite(offset) || offset < 0) return res.status(400).json({ message: "offset이 올바르지 않습니다." });
  if (!Number.isFinite(limit) || limit <= 0) return res.status(400).json({ message: "limit이 올바르지 않습니다." });

  try {
    const [items, total] = await Promise.all([
      findUserPostMedia(userId, offset, limit),
      countUserPostMedia(userId),
    ]);

    return res.json({
      items,
      total, // ✅ 추가(프론트에서 필요할 수 있음)
      offset,
      limit,
      hasMore: offset + items.length < total,
    });
  } catch (e) {
    console.error("❌ user media 오류:", e);
    return res.status(500).json({ message: "서버 오류" });
  }
});

export default router;
