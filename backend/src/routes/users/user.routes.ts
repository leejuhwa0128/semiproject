import { Router } from "express";
import { authMiddleware, AuthRequest } from "../../middleware/auth";
import {
  findUserById,
  isNicknameExists,
  updateUserProfile,
  isEmailExists,
  findUserProfile,
} from "../../data/users.db";

const router = Router();

/**
 * 🔹 내 프로필 조회
 * GET /api/users/me
 */
router.get("/me", authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user!.userId;

  try {
    const user = await findUserById(userId);
    if (!user) return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });

    // ✅ 프론트 라우팅/분기 위해 userId는 꼭 내려줘야 함
    return res.json({
      userId: user.userId,               // ✅ 추가
      loginId: user.loginId ?? null,     // (있으면 같이)
      nickname: user.nickname,
      email: user.email,
      intro: user.intro,
      profileImageUrl: user.profileImageUrl,
      postCount: user.postCount ?? 0,
      followerCount: user.followerCount ?? 0,
      followingCount: user.followingCount ?? 0,
    });
  } catch (err) {
    console.error("❌ /users/me 오류:", err);
    return res.status(500).json({ message: "서버 오류" });
  }
});

/**
 * 🔹 닉네임 중복 확인
 * GET /api/users/check-nickname?nickname=xxx
 */
router.get("/check-nickname", async (req, res) => {
  const nickname = String(req.query.nickname || "").trim();
  if (!nickname) return res.status(400).json({ message: "nickname required" });

  try {
    const exists = await isNicknameExists(nickname);
    return res.json({ available: !exists });
  } catch (err) {
    console.error("❌ check-nickname 오류:", err);
    return res.status(500).json({ message: "서버 오류" });
  }
});

router.get("/check-email", async (req, res) => {
  const email = String(req.query.email || "").trim();
  if (!email) return res.status(400).json({ message: "email required" });

  try {
    const exists = await isEmailExists(email);
    return res.json({ available: !exists });
  } catch (err) {
    console.error("❌ check-email 오류:", err);
    return res.status(500).json({ message: "서버 오류" });
  }
});

/**
 * 🔹 프로필 저장
 * PUT /api/users/me
 */
router.put("/me", authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user!.userId;

  const nickname = req.body.nickname?.trim();
  const email = req.body.email?.trim();
  const intro = req.body.intro === undefined ? undefined : (req.body.intro as string | null);

  try {
    await updateUserProfile(userId, { nickname, email, intro });
    return res.json({ success: true });
  } catch (err) {
    console.error("❌ /users/me PUT 오류:", err);
    return res.status(500).json({ message: "서버 오류" });
  }
});

/**
 * ✅ 타인 프로필 조회
 * GET /api/users/:userId
 */
router.get("/:userId", authMiddleware, async (req, res) => {
  const userId = Number(req.params.userId);
  if (!Number.isFinite(userId)) return res.status(400).json({ message: "잘못된 userId" });

  try {
    const profile = await findUserProfile(userId);
    if (!profile) return res.status(404).json({ message: "사용자 없음" }); // ✅ null 처리
    return res.json(profile);
  } catch (e) {
    console.error("❌ /users/:userId 오류:", e);
    return res.status(500).json({ message: "서버 오류" });
  }
});

export default router;
