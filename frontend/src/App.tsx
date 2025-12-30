import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./api/ProtectedRoute";

import LoginPage from "./pages/login";
import SignUpPage from "./pages/signup";
import MainPage from "./pages/main";
import FindIdForm from "./pages/find/FindIdForm";
import FindPasswordForm from "./pages/find/FindPasswordForm";
import LogoutPage from "./pages/logout/LogoutPage";
import Post from "./pages/Post/Post";
import ProfileEditPage from "./pages/profile/ProfileEditPage";
import Sidebar from "./pages/Sidebar/Sidebar";
import ProfilePage from "./pages/profile/ProfilePage";
import "./App.css";

const getMyUserId = () => {
  const v = localStorage.getItem("userId");
  const id = v ? Number(v) : NaN;
  return Number.isFinite(id) ? id : null;
};

const MainLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="main-layout">
    <Sidebar />
    <div className="main-content">{children}</div>
  </div>
);

export default function App() {
  const myId = getMyUserId();

  return (
    <div className="app-root">
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/find-id" element={<FindIdForm />} />
        <Route path="/find-password" element={<FindPasswordForm />} />
        <Route path="/logout" element={<LogoutPage />} />

        <Route
          path="/main"
          element={
            <ProtectedRoute>
              <MainLayout>
                <MainPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* ✅ /profile 들어오면 내 아이디로 보내기 */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              {myId ? <Navigate to={`/profile/${myId}`} replace /> : <Navigate to="/" replace />}
            </ProtectedRoute>
          }
        />

        {/* ✅ 타인/내 프로필 공용 */}
        <Route
          path="/profile/:userId"
          element={
            <ProtectedRoute>
              <MainLayout>
                <ProfilePage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile/edit"
          element={
            <ProtectedRoute>
              <MainLayout>
                <ProfileEditPage />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/Post"
          element={
            <ProtectedRoute>
              <MainLayout>
                <Post />
              </MainLayout>
            </ProtectedRoute>
          }
        />

        {/* ✅ 없는 경로 방지 */}
        <Route path="*" element={<Navigate to="/main" replace />} />
      </Routes>
    </div>
  );
}
