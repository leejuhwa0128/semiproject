import { useState } from "react";
import type { FormEvent } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function SignUpForm() {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [email, setEmail] = useState("");
    const [nickname, setNickname] = useState("");
    const [passwordCheck, setPasswordCheck] = useState("");

    const [result, setResult] = useState<string>("");
    const [idCheckMessage, setIdCheckMessage] = useState("");  // 중복확인 메시지
    const [isIdChecked, setIsIdChecked] = useState(false);     // 중복확인 여부

    const navigate = useNavigate();

    // 아이디 중복확인
    const handleIdCheck = async () => {
        if (!username) {
            setIdCheckMessage("아이디를 입력하세요.");
            return;
        }

        try {
            const res = await axios.post(
                "http://localhost:4000/api/sign/check-id",
                { loginId: username }
            );

            setIdCheckMessage(res.data.message);
            setIsIdChecked(true); // 중복확인 완료

        } catch (err: any) {
            console.error(err);
            setIdCheckMessage(err.response?.data?.message || "중복확인 실패");
            setIsIdChecked(false);
        }
    };


    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();

        if (!isIdChecked) {
            setResult("아이디 중복확인을 먼저 해주세요.");
            return;
        }

        if (password !== passwordCheck) {
            setResult("비밀번호가 일치하지 않습니다.");
            return;
        }

        try {
            await axios.post(
                "http://localhost:4000/api/sign/register",
                {
                    loginId: username,
                    password,
                    email,
                    nickname,
                }
            );

            alert("회원가입 성공! 로그인 해주세요.");
            navigate("/");

        } catch (err) {
            console.error(err);
            setResult("회원가입 실패.");
        }
    };


    return (
        <div className="signup-container">
            <h2 className="signup-title">회원가입</h2>

            <form className="signup-form" onSubmit={handleSubmit}>

                {/* 아이디 입력 */}
                <label>아이디</label>
                <div className="signup-id-row">
                    <input
                        type="text"
                        placeholder="your_id"
                        value={username}
                        onChange={(e) => {
                            setUsername(e.target.value);
                            setIsIdChecked(false);
                            setIdCheckMessage("");
                        }}
                        required
                        className="signup-id-input"
                    />

                    <button
                        type="button"
                        onClick={handleIdCheck}
                        disabled={isIdChecked}
                        className="signup-id-check-btn"
                    >
                        {isIdChecked ? "확인됨" : "중복확인"}
                    </button>
                </div>


                {idCheckMessage && (
                    <p style={{ marginTop: "6px", color: "green" }}>{idCheckMessage}</p>
                )}

                {/* 비밀번호 */}
                <label>비밀번호</label>
                <input
                    type="password"
                    placeholder="•••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />

                {/* 비밀번호 확인 */}
                <label>비밀번호 확인</label>
                <input
                    type="password"
                    placeholder="•••••••"
                    value={passwordCheck}
                    onChange={(e) => setPasswordCheck(e.target.value)}
                    required
                />

                {/* 이메일 */}
                <label>이메일</label>
                <input
                    type="email"
                    placeholder="example@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />

                {/* 닉네임 */}
                <label>닉네임</label>
                <input
                    type="text"
                    placeholder="nickname"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    required
                />

                <button type="submit">회원가입</button>
            </form>

            {result && (
                <p style={{ marginTop: "16px", color: "#4f46e5" }}>{result}</p>
            )}
        </div>
    );
}

export default SignUpForm;