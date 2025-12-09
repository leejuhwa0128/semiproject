import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from 'react-router-dom';
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [result, setResult] = useState<string>("");
  const navigate = useNavigate();


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    try {
      const res = await api.post("/api/users/login", {
        loginId: username,
        password: password,
      });

      localStorage.setItem("token", res.data.token);

      alert("로그인 성공!");
      navigate("/main"); //로그인 성공 -> 메인 페이지

    } catch (err) {
      console.error(err);
      setResult("아이디 또는 비밀번호가 잘못 되었습니다. 아이디와 비밀번호를 정확히 입력해 주세요.");
    }
  };

  return (
    <div className="login-container">
      <h2 className="login-title">로그인</h2>

      <form className="login-form" onSubmit={handleSubmit}>
        <label>아이디</label>
        <input
          type="text"
          placeholder="아이디를 입력하세요."
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />

        <label>비밀번호</label>
        <input
          type="password"
          placeholder="•••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit">로그인</button>
      </form>

      <div className="login-links">
        <Link to="/signup" className="link">회원가입</Link>
        <span className="divider">|</span>
        <Link to="/find-id" className="link">아이디 찾기</Link>
        <span className="divider">|</span>
        <Link to="/find-password" className="link">비밀번호 찾기</Link>
      </div>


      {result && (
        <p style={{ marginTop: "20px", color: "blue" }}>
          {result}
        </p>
      )}
    </div>

  );
}

export default LoginForm;