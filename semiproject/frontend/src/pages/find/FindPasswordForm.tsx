// src/pages/find/FindPasswordForm.tsx
import { useState } from "react";
import type { FormEvent } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";

function FindPasswordForm() {
    const [loginId, setLoginId] = useState("");
    const [email, setEmail] = useState("");
    const [resultMessage, setResultMessage] = useState("");
    const [isError, setIsError] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();


    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!loginId || !email) {
            setIsError(true);
            setResultMessage("아이디와 이메일을 모두 입력해주세요.");
            return;
        }

        try {
            setLoading(true);
            setResultMessage("");

            const res = await axios.post(
                "http://localhost:4000/api/users/reset-password",
                {
                    loginId,
                    email,
                }
            );

            setIsError(false);
            setResultMessage(res.data.message || "임시 비밀번호를 이메일로 발송했습니다.");

            // 2초 뒤 로그인 페이지로 이동
            setTimeout(() => {
                navigate("/");
            }, 2000);
        } catch (err: any) {
            console.error(err);
            setIsError(true);
            setResultMessage(
                err.response?.data?.message ||
                "비밀번호 찾기에 실패했습니다. 다시 시도해 주세요."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <h2 className="login-title">비밀번호 찾기</h2>

            <form className="login-form" onSubmit={handleSubmit}>
                <label>아이디</label>
                <input
                    type="text"
                    placeholder="가입하신 아이디를 입력하세요."
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    required
                />

                <label>가입 이메일</label>
                <input
                    type="email"
                    placeholder="가입하신 이메일을 입력하세요."
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />

                <button type="submit" disabled={loading}>
                    {loading ? "전송 중..." : "임시 비밀번호 발송"}
                </button>
            </form>

            <div className="login-links">
                <Link to="/" className="link">
                    로그인
                </Link>
                <span className="divider">|</span>
                <Link to="/signup" className="link">
                    회원가입
                </Link>
                <span className="divider">|</span>
                <Link to="/find-id" className="link">
                    아이디 찾기
                </Link>
            </div>

            {resultMessage && (
                <p
                    style={{
                        marginTop: "16px",
                        color: isError ? "crimson" : "#4f46e5",
                    }}
                >
                    {resultMessage}
                </p>
            )}
        </div>
    );
}

export default FindPasswordForm;
