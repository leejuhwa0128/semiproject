// src/App.tsx
import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/login";
import SignUpPage from "./pages/signup";
import MainPage from "./pages/main";
import FindIdForm from "./pages/find/FindIdForm";
import FindPasswordForm from "./pages/find/FindPasswordForm";

import "./App.css";

function App() {
  return (
    <div className="app-root">
      <Routes>
        {/* 기본 페이지 → 로그인 */}
        <Route path="/" element={<LoginPage />} />

        {/* 회원가입 페이지 */}
        <Route path="/signup" element={<SignUpPage />} />

        {/* 메인 페이지 */}
        <Route path="/main" element={<MainPage />} />

        {/* 아이디 찾기 페이지 */}
        <Route path="/find-id" element={<FindIdForm />} />

        {/* 패스워드 찾기 페이지 */}
        <Route path="/find-password" element={<FindPasswordForm />} />
      </Routes>



    </div>
  );
}

export default App;
