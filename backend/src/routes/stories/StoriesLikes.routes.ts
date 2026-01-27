import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../../middleware/auth";
import { toggleStoryLike } from "../../data/StoriesLikes.db";

const router = Router();

/**
 * 스토리 좋아요 토글
 */
router.post(
  "/:storyId/like",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const storyId = Number(req.params.storyId);
      const userId = req.user!.userId;

      const result = await toggleStoryLike(storyId, userId);

      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "스토리 좋아요 실패" });
    }
  }
);

export default router;
