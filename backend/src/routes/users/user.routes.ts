import { Router } from "express";
import { authMiddleware, AuthRequest } from "../../middleware/auth";
import { findUserById, isNicknameExists, updateUserProfile, isEmailExists} from "../../data/users.db";

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
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    return res.json({
      nickname: user.nickname,
      email: user.email,
      intro: user.intro,
      profileImageUrl: user.profileImageUrl,
      postCount: user.postCount ?? 0,
      followerCount: user.followerCount ?? 0,
      followingCount: user.followingCount ?? 0,
      
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "서버 오류" });
  }
});

/**
 * 🔹 닉네임 중복 확인
 * GET /api/users/check-nickname?nickname=xxx
 */
router.get("/check-nickname", async (req, res) => {
  const nickname = String(req.query.nickname || "").trim();
  if (!nickname) {
    return res.status(400).json({ message: "nickname required" });
  }

  try {
    const exists = await isNicknameExists(nickname);
    return res.json({ available: !exists });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "서버 오류" });
  }
});

router.get("/check-email", async (req, res) => {
  const email = String(req.query.email || "").trim();
  if (!email) {
    return res.status(400).json({ message: "email required" });
  } 
  try {
    const exists = await isEmailExists(email);
    return res.json({ available: !exists });
  } catch (err) {
    console.error("이메일 중복 확인 오류:", err);
    return res.status(500).json({ message: "서버 오류" });
  }
});

/**
 * 🔹 프로필 저장 (최종 제출)
 * PUT /api/users/me
 */
router.put("/me", authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user!.userId;

  const nickname = req.body.nickname?.trim();
  const email = req.body.email?.trim();
  const intro =
    req.body.intro === undefined ? undefined : (req.body.intro as string | null);

  try {
    await updateUserProfile(userId, {
      nickname,
      email,
      intro,
    });

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "서버 오류" });
  }
});

export default router;
