import { Router } from "express";
import multer from "multer";
import path from "path";

const router = Router();

// 업로드 폴더 설정
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, filename);
  },
});

const upload = multer({ storage });

/**
 * POST /api/media/upload
 */
router.post("/upload", upload.array("media"), (req, res) => {
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    return res.status(400).json({ message: "파일 없음" });
  }

  const urls = files.map((file) => ({
    url: `/uploads/${file.filename}`,
    type: file.mimetype.startsWith("video") ? "video" : "image",
  }));

  res.json({ urls });
});

export default router;
