import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "./api/ProtectedRoute";

import LoginPage from "./pages/login";
import SignUpPage from "./pages/signup";
import MainPage from "./pages/main";
import FindIdForm from "./pages/find/FindIdForm";
import FindPasswordForm from "./pages/find/FindPasswordForm";
import LogoutPage from "./pages/logout/LogoutPage";
import Post from "./pages/Post/Post";




import Sidebar from "./pages/Sidebar/Sidebar";
import ProfilePage from "./pages/profile/ProfilePage"; // ⭐ 이 줄 추가

import "./App.css";

function App() {
  return (
    <div className="app-root">
      <Routes>
        {/* 기본 페이지 → 로그인 */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* 회원가입 페이지 */}
        <Route path="/signup" element={<SignUpPage />} />

        {/* 아이디 찾기 페이지 */}
        <Route path="/find-id" element={<FindIdForm />} />

        {/* 패스워드 찾기 페이지 */}
        <Route path="/find-password" element={<FindPasswordForm />} />

        {/* 로그아웃 */}
        <Route path="/logout" element={<LogoutPage />} />

        {/* 메인 페이지 */}
        <Route
          path="/main"
          element={
            <ProtectedRoute>
              <div className="main-layout">
                <Sidebar />
                <div className="main-content">
                  <MainPage />
                </div>
              </div>
            </ProtectedRoute>
          }
        />

        {/* 프로필 페이지 */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <div className="main-layout">
                <Sidebar />
                <div className="main-content">
                  <ProfilePage />
                </div>
              </div>
            </ProtectedRoute>
          }
        />
 {/* ⭐ 게시글 작성 페이지 */} 
<Route
  path="/Post"
  element={
    <ProtectedRoute>
      <div className="main-layout">
        <Sidebar />
        <div className="main-content">
          <Post />
        </div>
      </div>
    </ProtectedRoute>
  }
/>



      </Routes>
    </div>
  );
}

export default App;
