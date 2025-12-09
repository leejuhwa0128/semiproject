import { useState } from "react";
import type { FormEvent } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";

function FindIdForm() {
    const [email, setEmail] = useState("");
    const [resultMessage, setResultMessage] = useState<string>("");
    const [isError, setIsError] = useState(false);
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!email) {
            setIsError(true);
            setResultMessage("이메일을 입력해주세요.");
            return;
        }

        try {
            setLoading(true);
            setResultMessage("");

            await axios.post(
                "http://localhost:4000/api/users/find-id",
                { email }
            );

            setIsError(false);
            setResultMessage("이메일로 아이디를 전송했습니다. 메일을 확인해주세요!");

            // 2초 후 로그인 페이지로 이동
            setTimeout(() => {
                navigate("/");
            }, 2000);

        } catch (err: any) {
            console.error(err);
            setIsError(true);
            setResultMessage(
                err.response?.data?.message || "아이디 찾기에 실패했습니다."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <h2 className="login-title">아이디 찾기</h2>

            <form className="login-form" onSubmit={handleSubmit}>
                <label>가입 이메일</label>
                <input
                    type="email"
                    placeholder="가입하신 이메일을 입력하세요."
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />

                <button type="submit" disabled={loading}>
                    {loading ? "전송 중..." : "아이디 찾기"}
                </button>
            </form>

            <div className="login-links">
                <Link to="/" className="link">로그인</Link>
                <span className="divider">|</span>
                <Link to="/signup" className="link">회원가입</Link>
                <span className="divider">|</span>
                <Link to="/find-password" className="link">비밀번호 찾기</Link>
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

export default FindIdForm;
