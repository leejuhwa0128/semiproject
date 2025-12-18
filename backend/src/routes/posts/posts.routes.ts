import { Router } from "express";
import { createPost } from "../../data/posts.db";
import { insertPostMedia } from "../../data/post_media.db";

const router = Router();

/**
 * 테스트
 */
router.get("/test", (req, res) => {
  res.json({ message: "posts router alive" });
});

/**
 * 게시글 + 이미지 저장
 */
router.post("/", async (req, res) => {
  console.log("🔥 /api/posts HIT");
  console.log("📦 body:", req.body);

  try {
const { userId, content, emotion, mediaUrls } = req.body;

    if (
  userId === undefined ||
  !content ||
  emotion === undefined ||
  emotion < 0 ||
  emotion > 10
) {
  return res.status(400).json({
    message: "userId, content, emotion(0~10) 필수",
  });
}


    // 1️⃣ posts 저장
const postId = await createPost(userId, content, emotion);

    // 2️⃣ post_media 저장
    if (Array.isArray(mediaUrls)) {
      for (const media of mediaUrls) {
        await insertPostMedia(
          postId,
          media.url,
          media.type
        );
      }
    }

    res.json({
      success: true,
      postId,
    });
  } catch (err) {
    console.error("❌ 게시글 저장 실패:", err);
    res.status(500).json({ message: "게시글 저장 실패" });
  }
});

export default router;
