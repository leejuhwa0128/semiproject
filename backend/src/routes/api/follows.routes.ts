import { Router } from "express";
import { authMiddleware, AuthRequest } from "../../middleware/auth";
import { toggleFollow, removeFollower } from "../../data/follows.db";

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

/**
 * ✅ 내 팔로워 삭제(차단 아님, 팔로우 관계만 끊음)
 * DELETE /api/follows/followers/:followerUserId
 */
router.delete("/followers/:followerUserId", authMiddleware, async (req: AuthRequest, res) => {
  const me = req.user!.userId;
  const followerUserId = Number(req.params.followerUserId);

  if (!Number.isFinite(followerUserId)) {
    return res.status(400).json({ message: "followerUserId가 올바르지 않습니다." });
  }
  if (me === followerUserId) {
    return res.status(400).json({ message: "자기 자신은 삭제할 수 없습니다." });
  }

  try {
    const ok = await removeFollower({ meUserId: me, followerUserId });
    if (!ok) return res.status(404).json({ message: "팔로워 관계가 없습니다." });
    return res.json({ ok: true });
  } catch (e) {
    console.error("팔로워 삭제 오류:", e);
    return res.status(500).json({ message: "서버 오류" });
  }
});

export default router;
