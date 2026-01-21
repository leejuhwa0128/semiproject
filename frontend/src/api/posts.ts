import api from "./axios";

// 추천 피드 불러오기
export async function fetchRecommendedPosts() {
  try {
    const res = await api.get("/api/posts/recommended"); // 서버 라우트와 일치
    return res.data; // { baseEmotion, feed }
  } catch (err: any) {
    console.error("추천 피드 불러오기 실패", {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
      headers: err.config?.headers,
      url: err.config?.url,
    });
    throw err;
  }
}

// 좋아요 토글
export async function togglePostLike(postId: number, isLike: boolean) {
  try {
    if (isLike) {
      const res = await api.post(`/api/posts/${postId}/like`);
      return res.data;
    } else {
      const res = await api.delete(`/api/posts/${postId}/like`);
      return res.data;
    }
  } catch (err: any) {
    console.error("좋아요 API 오류", {
      postId,
      isLike,
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    });
    throw err;
  }
}
