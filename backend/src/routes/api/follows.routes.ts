import { Router } from "express";
import { authMiddleware, AuthRequest } from "../../middleware/auth";
import { toggleFollow } from "../../data/follows.db";

const router = Router();

/**
 * POST /api/follows/toggle
 * body: { targetUserId: number }
 * return: { isFollowing: boolean }
 */
router.post("/toggle", authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const targetUserId = Number(req.body?.targetUserId);

  if (Number.isNaN(targetUserId)) {
    return res.status(400).json({ message: "targetUserId가 올바르지 않습니다." });
  }
  if (targetUserId === userId) {
    return res.status(400).json({ message: "자기 자신을 팔로우할 수 없습니다." });
  }

  try {
    const result = await toggleFollow(userId, targetUserId);
    return res.json(result); // { isFollowing }
  } catch (err) {
    console.error("📌 팔로우 토글 오류:", err);
    return res.status(500).json({ message: "서버 오류" });
  }
});

export default router;
