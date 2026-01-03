import oracledb from "oracledb";

import express, { Request, Response } from "express";
import cors from "cors";
import path from "path"; // ✅ 추가

// posts media
import mediaRouter from "./routes/posts/media.routes";

// users
import findRouter from "./routes/users/find.routes";
import loginRouter from "./routes/users/login.routes";
import signupRouter from "./routes/users/sign.routes";
import userRoutes from "./routes/users/user.routes";

// main
import mainRouter from "./routes/main/main.routes";

// posts
import postsRouter from "./routes/posts/posts.routes";
import commentsRouter from "./routes/posts/comments.routes";
import myPostRoutes from "./routes/posts/myposts.routes";
import userPostRoutes from "./routes/posts/userposts.routes";

//스토리
import storiesRouter from "./routes/stories/stories.routes";

import storyMediaRouter from "./routes/stories/media.routes";

// api follows
import followRouter from "./routes/api/follows.routes";

//DB 연결
import "dotenv/config";
import { initOraclePool } from "./config/oracle";



const app = express();
const PORT = 4000;

// JSON body 파싱
app.use(express.json());

// CORS 설정
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

// ✅ 업로드 폴더 정적 서빙 (한 번만!)
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// 헬스 체크
app.get("/api/health", (req: Request, res: Response) => {
  res.json({ status: "ok", message: "Backend is running 🚀" });
});

// ===== 라우터 =====

// 이메일 인증
app.use("/api/users", findRouter);

// 로그인 라우터
app.use("/api/users", loginRouter);

// 회원가입 라우터
app.use("/api/sign", signupRouter);

// 유저 라우터
app.use("/api/users", userRoutes);

// 유저 게시글/팔로우/댓글
app.use("/api/follows", followRouter);
app.use("/api/comments", commentsRouter);

// 게시글
app.use("/api/posts", myPostRoutes);
app.use("/api/posts", userPostRoutes);
app.use("/api/posts", postsRouter);

// 메인
app.use("/api/main", mainRouter);

// 미디어
app.use("/api/media", mediaRouter);

// 스토리
app.use("/api/stories/media", storyMediaRouter);
app.use("/api/stories", storiesRouter);



// 서버 시작 (Oracle 풀 준비 후)
(async () => {
  try {
    await initOraclePool();
    app.listen(PORT, () => {
      console.log(`✅ Backend server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("서버 시작 실패:", err);
    process.exit(1);
  }
})();
