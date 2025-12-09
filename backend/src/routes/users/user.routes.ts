// backend/src/routes/users/user.routes.ts

import { Router } from "express";
import { authMiddleware, AuthRequest } from "../../middleware/auth";
import { findUserById } from "../../data/users.db";

const router = Router();

/**
 * 🔹 내 프로필 조회
 * GET /api/users/me
 */
router.get("/me", authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user!.userId;

  try {
    const user = await findUserById(userId);

    if (!user) {
      return res.status(404).json({
        message: "사용자를 찾을 수 없습니다.",
      });
    }

    return res.json({
      userId: user.userId,
      loginId: user.loginId,
      nickname: user.nickname,
      intro: user.intro,
      postCount: user.postCount ?? 0,
      followerCount: user.followerCount ?? 0,
      followingCount: user.followingCount ?? 0,
      profileImageUrl: user.profileImageUrl ?? null,
    });
  } catch (err: any) {
    console.error("📌 프로필 조회 오류:", err);
    return res.status(500).json({
      message: "서버 오류",
      error: err.message,
    });
  }
});

export default router;
