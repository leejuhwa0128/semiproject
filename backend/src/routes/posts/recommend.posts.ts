import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../../middleware/auth";
import { calculateFinalBaseEmotion, getRecommendedFeed } from "../../data/recommend.db";

const router = Router();

router.get("/recommended", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const baseEmotion = await calculateFinalBaseEmotion(userId);
    const feed = await getRecommendedFeed(baseEmotion, userId);

    res.json({ baseEmotion, feed }); // ← 프론트에서 baseEmotion 필요
  } catch (err) {
    console.error("추천 피드 오류:", err);
    res.status(500).json({ message: "추천 피드 실패" });
  }
});

export default router;