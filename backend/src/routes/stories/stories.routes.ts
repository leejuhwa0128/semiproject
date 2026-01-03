import express from "express";
import {
  createStoryWithMedia,
  getStoryMediaGrid,
  getStoryDetail,
  deleteStory,
} from "../../data/stories.db";

const router = express.Router();

// ✅ 이 파일이 실제로 로드되는지 확인 (서버 시작할 때 콘솔에 떠야 함)
console.log("🔥 stories.routes.ts LOADED");


/**
 * ✅ 스토리 생성
 * POST /api/stories
 * body: { userId, content?, mediaUrls?: string[], emotionScore?: number }
 */
router.post("/", async (req, res) => {
  // ✅ 요청이 이 라우트까지 들어오는지 확인 (버튼 누를 때마다 떠야 함)
  console.log("🔥 POST /api/stories HIT");
  console.log("🔥 BODY:", req.body);

  try {
    const { userId, content, mediaUrls, emotionScore } = req.body as {
      userId: number;
      content?: string;
      mediaUrls?: string[];
      emotionScore?: number | null;
    };

    if (!userId) return res.status(400).json({ message: "userId required" });

    // ✅ 1~10만 허용, 아니면 null
    const score =
      typeof emotionScore === "number" &&
      Number.isFinite(emotionScore) &&
      emotionScore >= 1 &&
      emotionScore <= 10
        ? emotionScore
        : null;

    const storyId = await createStoryWithMedia(
      userId,
      content?.trim() || null,
      Array.isArray(mediaUrls) ? mediaUrls : [],
      score // ✅ EMOTION_SCORE 전달
    );

    return res.json({ storyId });
  } catch (e) {
    console.error("POST /api/stories error:", e);
    return res.status(500).json({ message: "server error" });
  }
});

/**
 * ✅ 프로필 스토리 그리드 (남의 프로필)
 * GET /api/stories/user/:userId/media?offset=0&limit=3
 */
router.get("/user/:userId/media", async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (!Number.isFinite(userId))
      return res.status(400).json({ message: "invalid userId" });

    const offset = Number(req.query.offset ?? 0);
    const limit = Number(req.query.limit ?? 3);

    const data = await getStoryMediaGrid(
      userId,
      Number.isFinite(offset) ? offset : 0,
      Number.isFinite(limit) ? limit : 3
    );

    return res.json(data);
  } catch (e) {
    console.error("GET /api/stories/user/:userId/media error:", e);
    return res.status(500).json({ message: "server error" });
  }
});

/**
 * ✅ 프로필 스토리 그리드 (내 프로필)
 * GET /api/stories/my-media?userId=1&offset=0&limit=3
 *
 * ⚠️ 지금은 userId를 query로 받는 "임시" 방식
 * 나중에 JWT 붙이면 여기서 토큰에서 userId 꺼내면 됨
 */
router.get("/my-media", async (req, res) => {
  try {
    const userId = Number(req.query.userId);
    if (!Number.isFinite(userId))
      return res.status(400).json({ message: "userId(query) required" });

    const offset = Number(req.query.offset ?? 0);
    const limit = Number(req.query.limit ?? 3);

    const data = await getStoryMediaGrid(
      userId,
      Number.isFinite(offset) ? offset : 0,
      Number.isFinite(limit) ? limit : 3
    );

    return res.json(data);
  } catch (e) {
    console.error("GET /api/stories/my-media error:", e);
    return res.status(500).json({ message: "server error" });
  }
});

/**
 * ✅ (선택) 스토리 상세 (모달용)
 * GET /api/stories/:storyId
 */
router.get("/:storyId", async (req, res) => {
  try {
    const storyId = Number(req.params.storyId);
    if (!Number.isFinite(storyId))
      return res.status(400).json({ message: "invalid storyId" });

    const data = await getStoryDetail(storyId);
    if (!data) return res.status(404).json({ message: "story not found" });

    return res.json(data);
  } catch (e) {
    console.error("GET /api/stories/:storyId error:", e);
    return res.status(500).json({ message: "server error" });
  }
});

/**
 * ✅ (선택) 스토리 삭제
 * DELETE /api/stories/:storyId
 *
 * ⚠️ 권한 체크(내 스토리인지)는 JWT 붙일 때 함께 처리 추천
 */
router.delete("/:storyId", async (req, res) => {
  try {
    const storyId = Number(req.params.storyId);
    if (!Number.isFinite(storyId))
      return res.status(400).json({ message: "invalid storyId" });

    const rows = await deleteStory(storyId);
    if (!rows) return res.status(404).json({ message: "story not found" });

    return res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/stories/:storyId error:", e);
    return res.status(500).json({ message: "server error" });
  }
});

export default router;
