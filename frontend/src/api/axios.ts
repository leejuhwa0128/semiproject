import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:4000",
});

// 요청 인터셉터: 토큰 자동 추가
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 응답 인터셉터: 인증 실패 처리
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn("인증 실패 → 로그인 페이지로 이동");
      window.location.href = "/";
    }
    return Promise.reject(error);
  }
);

export default api;
