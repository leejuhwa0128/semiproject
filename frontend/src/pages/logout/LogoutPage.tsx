import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const LogoutPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // 로컬스토리지 토큰 삭제
    localStorage.removeItem("token");

    // 로그인 페이지로 이동
    navigate("/", { replace: true });
  }, [navigate]);

  return null;
};

export default LogoutPage;
