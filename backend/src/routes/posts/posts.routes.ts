import { Router } from "express";
import { createPost } from "../../data/posts.db";
import { insertPostMedia } from "../../data/post_media.db";
import { authMiddleware, AuthRequest } from "../../middleware/auth";

const router = Router();

router.post("/", authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { content, emotion, mediaUrls } = req.body;
    const userId = req.user!.userId; // ⭐ 여기서 로그인 유저 ID

    if (!content || emotion < 0 || emotion > 10) {
      return res.status(400).json({ message: "content, emotion 필수" });
    }

    // 1️⃣ posts 저장
    const postId = await createPost(userId, content, emotion);

    // 2️⃣ media 저장
    if (Array.isArray(mediaUrls)) {
      for (const media of mediaUrls) {
        await insertPostMedia(postId, media.url, media.type);
      }
    }

    res.json({ success: true, postId });
  } catch (err) {
    console.error("❌ 게시글 저장 실패:", err);
    res.status(500).json({ message: "게시글 저장 실패" });
  }
});

export default router;
