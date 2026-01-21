import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../../middleware/auth";
import { togglePostLike } from "../../data/likes.db";

const router = Router();

router.post(
  "/:postId/like",
  authMiddleware,
  async (req: AuthRequest, res: Response) => {
    try {
      const postId = Number(req.params.postId);
      const userId = req.user!.userId;

      const result = await togglePostLike(postId, userId);

      res.json(result);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "좋아요 실패" });
    }
  }
);

export default router;
