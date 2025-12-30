import { Router } from "express";
import { authMiddleware, AuthRequest } from "../../middleware/auth";
import multer, { FileFilterCallback } from "multer";

import {
  findUserById,
  isNicknameExists,
  updateUserProfile,
  isEmailExists,
  findUserProfile,
} from "../../data/users.db";

import {
  findFollowers,
  findFollowing,
  countFollowers,
  countFollowing,
} from "../../data/followlists.users.db";

import path from "path";
import fs from "fs";

const router = Router();

/** ================== ✅ multer 설정(반드시 라우터 등록 전에!) ================== */
const uploadDir = path.join(process.cwd(), "uploads", "profile");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const deleteOldProfileFiles = (userId: number) => {
  const files = fs.readdirSync(uploadDir);
  for (const f of files) {
    if (f.startsWith(`${userId}.`)) {
      try {
        fs.unlinkSync(path.join(uploadDir, f));
      } catch {}
    }
  }
};

const storage = multer.diskStorage({
  destination: (req: any, file, cb) => cb(null, uploadDir),
  filename: (req: any, file, cb) => {
    const userId = req.user!.userId;
    const ext = path.extname(file.originalname).toLowerCase();
    deleteOldProfileFiles(userId);
    cb(null, `${userId}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req: any, file: Express.Multer.File, cb: FileFilterCallback) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("이미지 파일만 가능"));
      return;
    }
    cb(null, true);
  },
});


/** ================== 라우터들 ================== */

/** 내 프로필 조회 */
router.get("/me", authMiddleware, async (req: AuthRequest, res) => {
  const userId = req.user!.userId;

  try {
    const user = await findUserById(userId);
    if (!user) return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });

    return res.json({
      userId: user.userId,
      loginId: user.loginId ?? null,
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

/** 닉네임 중복 확인 */
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

/** 이메일 중복 확인 */
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

/** ✅ 프로필 저장 (사진 포함) */
router.put(
  "/me",
  authMiddleware,
  upload.single("profileImage"),
  async (req: AuthRequest, res) => {
    const userId = req.user!.userId;

    const nickname = (req.body.nickname ?? "").trim();
    const email = (req.body.email ?? "").trim();
    const intro = req.body.intro === undefined ? undefined : (req.body.intro as string | null);

    const profileImageUrl = req.file ? `/uploads/profile/${req.file.filename}` : undefined;

    try {
      await updateUserProfile(userId, { nickname, email, intro, profileImageUrl });
      return res.json({ success: true, profileImageUrl });
    } catch (err) {
      console.error("❌ /users/me PUT 오류:", err);
      return res.status(500).json({ message: "서버 오류" });
    }
  }
);

/** 타인 프로필 조회 */
router.get("/:userId", authMiddleware, async (req: AuthRequest, res) => {
  const targetUserId = Number(req.params.userId);
  const viewerUserId = req.user!.userId;

  if (!Number.isFinite(targetUserId)) {
    return res.status(400).json({ message: "잘못된 userId" });
  }

  try {
    const profile = await findUserProfile(targetUserId, viewerUserId);
    if (!profile) return res.status(404).json({ message: "사용자 없음" });

    return res.json(profile);
  } catch (e) {
    console.error("❌ /users/:userId 오류:", e);
    return res.status(500).json({ message: "서버 오류" });
  }
});

/** 팔로워 목록 */
router.get("/:userId/followers", authMiddleware, async (req: AuthRequest, res) => {
  const targetUserId = Number(req.params.userId);
  const viewerUserId = req.user!.userId;

  const offset = Number(req.query.offset ?? 0);
  const limit = Number(req.query.limit ?? 50);

  if (!Number.isFinite(targetUserId)) return res.status(400).json({ message: "잘못된 userId" });

  try {
    const items = await findFollowers({
      targetUserId,
      viewerUserId,
      offset: Number.isFinite(offset) ? offset : 0,
      limit: Number.isFinite(limit) ? limit : 50,
    });

    const total = await countFollowers(targetUserId);
    const hasMore = offset + items.length < total;

    return res.json({ items, hasMore });
  } catch (e) {
    console.error("❌ followers 목록 오류:", e);
    return res.status(500).json({ message: "서버 오류" });
  }
});

/** 팔로잉 목록 */
router.get("/:userId/following", authMiddleware, async (req: AuthRequest, res) => {
  const targetUserId = Number(req.params.userId);
  const viewerUserId = req.user!.userId;

  const offset = Number(req.query.offset ?? 0);
  const limit = Number(req.query.limit ?? 50);

  if (!Number.isFinite(targetUserId)) return res.status(400).json({ message: "잘못된 userId" });

  try {
    const items = await findFollowing({
      targetUserId,
      viewerUserId,
      offset: Number.isFinite(offset) ? offset : 0,
      limit: Number.isFinite(limit) ? limit : 50,
    });

    const total = await countFollowing(targetUserId);
    const hasMore = offset + items.length < total;

    return res.json({ items, hasMore });
  } catch (e) {
    console.error("❌ following 목록 오류:", e);
    return res.status(500).json({ message: "서버 오류" });
  }
});

export default router;
