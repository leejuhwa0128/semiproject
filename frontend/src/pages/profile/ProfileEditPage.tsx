import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import "./ProfileEditPage.css";

interface UserMeResponse {
  nickname: string;
  email: string;
  intro?: string | null;
  profileImageUrl?: string | null;
}

const ProfileEditPage: React.FC = () => {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement | null>(null);

  /** 🔒 DB 원본 (콜아웃 고정용) */
  const [originalNickname, setOriginalNickname] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  /** ✏️ 폼 상태 (제출용) */
  const [formNickname, setFormNickname] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [intro, setIntro] = useState("");
  const [isIntroNull, setIsIntroNull] = useState(true);

  /** 모달 */
  const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  /** 모달 draft */
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [emailDraft, setEmailDraft] = useState("");

  /** 중복확인 */
  const [nickCheckStatus, setNickCheckStatus] =
    useState<"idle" | "checking" | "available" | "duplicate" | "error">("idle");
  const [nickCheckMsg, setNickCheckMsg] = useState("");

  const [emailCheckStatus, setEmailCheckStatus] =
    useState<"idle" | "checking" | "available" | "duplicate" | "error">("idle");
  const [emailCheckMsg, setEmailCheckMsg] = useState("");

  /** 초기 로드 */
  useEffect(() => {
    const fetchMe = async () => {
      const res = await api.get<UserMeResponse>("/api/users/me");
      const data = res.data;

      setOriginalNickname(data.nickname);
      setFormNickname(data.nickname);
      setFormEmail(data.email);
      setProfileImageUrl(data.profileImageUrl ?? null);

      if (data.intro == null) {
        setIntro("");
        setIsIntroNull(true);
      } else {
        setIntro(data.intro);
        setIsIntroNull(false);
      }
    };
    fetchMe();
  }, []);

  /** ================= 닉네임 ================= */
  const openNicknameModal = () => {
    setNicknameDraft(formNickname);
    setNickCheckStatus("idle");
    setNickCheckMsg("");
    setIsNicknameModalOpen(true);
  };

  const checkNicknameDuplicate = async () => {
    const value = nicknameDraft.trim();
    if (!value) {
      setNickCheckStatus("error");
      setNickCheckMsg("닉네임을 입력하세요.");
      return;
    }

    if (value === originalNickname) {
      setNickCheckStatus("available");
      setNickCheckMsg("현재 닉네임과 동일합니다.");
      return;
    }

    setNickCheckStatus("checking");
    const res = await api.get("/api/users/check-nickname", {
      params: { nickname: value },
    });

    if (res.data.available) {
      setNickCheckStatus("available");
      setNickCheckMsg("사용 가능한 닉네임입니다.");
    } else {
      setNickCheckStatus("duplicate");
      setNickCheckMsg("이미 사용 중인 닉네임입니다.");
    }
  };

  const applyNicknameChange = () => {
    if (nickCheckStatus !== "available") return;
    setFormNickname(nicknameDraft);
    setIsNicknameModalOpen(false);
  };

  /** ================= 이메일 ================= */
  const openEmailModal = () => {
    setEmailDraft(formEmail);
    setEmailCheckStatus("idle");
    setEmailCheckMsg("");
    setIsEmailModalOpen(true);
  };

  const checkEmailDuplicate = async () => {
    const value = emailDraft.trim();
    if (!value) return;

    if (value === formEmail) {
      setEmailCheckStatus("available");
      setEmailCheckMsg("현재 이메일과 동일합니다.");
      return;
    }

    setEmailCheckStatus("checking");
    const res = await api.get("/api/users/check-email", {
      params: { email: value },
    });

    if (res.data.available) {
      setEmailCheckStatus("available");
      setEmailCheckMsg("사용 가능한 이메일입니다.");
    } else {
      setEmailCheckStatus("duplicate");
      setEmailCheckMsg("이미 사용 중인 이메일입니다.");
    }
  };

  const applyEmailChange = () => {
    if (emailCheckStatus !== "available") return;
    setFormEmail(emailDraft);
    setIsEmailModalOpen(false);
  };

  /** ================= 제출 ================= */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await api.put("/api/users/me", {
      nickname: formNickname,
      email: formEmail,
      intro,
    });

    alert("프로필이 저장되었습니다.");
    navigate(-1);
  };

  return (
    <div className="pe-page">
      <div className="pe-wrap">
        <h1 className="pe-title">프로필 편집</h1>

        <form onSubmit={handleSubmit} className="pe-form">
          {/* 콜아웃 */}
          <div className="pe-card pe-callout">
            <div className="pe-avatar">
              {profileImageUrl ? (
                <img src={profileImageUrl} alt="프로필" />
              ) : (
                <div className="pe-avatar-placeholder">?</div>
              )}
            </div>

            <div className="pe-mid">
              <div className="pe-loginId">{originalNickname}</div>
            </div>

            <div className="pe-right">
              <button type="button" className="pe-photo-btn">
                사진 변경
              </button>
            </div>
          </div>

          {/* 닉네임 */}
          <div className="pe-section">
            <div className="pe-section-title">닉네임 수정</div>
            <input
              className="pe-input pe-clickable"
              value={formNickname}
              readOnly
              onClick={openNicknameModal}
            />
            <div className="pe-hint">클릭해서 닉네임을 변경할 수 있어요.</div>
          </div>

          {/* 소개 */}
          <div className="pe-section">
            <div className="pe-section-title">소개</div>
            <textarea
              className="pe-textarea"
              value={intro}
              onChange={(e) => {
                setIntro(e.target.value);
                if (isIntroNull) setIsIntroNull(false);
              }}
              placeholder={isIntroNull ? "소개를 입력하세요" : ""}
            />
          </div>

          {/* 이메일 */}
          <div className="pe-section">
            <div className="pe-section-title">이메일</div>
            <input
              className="pe-input pe-clickable"
              value={formEmail}
              readOnly
              onClick={openEmailModal}
            />
            <div className="pe-hint">클릭해서 이메일을 변경할 수 있어요.</div>
          </div>

          <div className="pe-actions">
            <button type="submit" className="pe-submit">
              제출
            </button>
            <button
              type="button"
              className="pe-cancel"
              onClick={() => navigate(-1)}
            >
              취소
            </button>
          </div>
        </form>
      </div>

      {/* 닉네임 모달 */}
      {isNicknameModalOpen && (
        <div className="pe-modal-backdrop" onClick={() => setIsNicknameModalOpen(false)}>
          <div className="pe-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pe-modal-title">닉네임 변경</div>

            <div className="pe-modal-row">
              <div className="pe-modal-label">수정 할 닉네임</div>
              <div className="pe-modal-inline">
                <input
                  className="pe-input"
                  value={nicknameDraft}
                  onChange={(e) => {
                    setNicknameDraft(e.target.value);
                    setNickCheckStatus("idle");
                    setNickCheckMsg("");
                  }}
                />
                <button
                  type="button"
                  className="pe-modal-btn pe-check-btn"
                  onClick={checkNicknameDuplicate}
                >
                  중복확인
                </button>
              </div>
              {nickCheckMsg && (
                <div className={`pe-check-msg ${nickCheckStatus === "available" ? "ok" : "bad"}`}>
                  {nickCheckMsg}
                </div>
              )}
            </div>

            <div className="pe-modal-actions">
              <button className="pe-modal-btn pe-primary" onClick={applyNicknameChange}>
                변경
              </button>
              <button className="pe-modal-btn" onClick={() => setIsNicknameModalOpen(false)}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 이메일 모달 */}
      {isEmailModalOpen && (
        <div className="pe-modal-backdrop" onClick={() => setIsEmailModalOpen(false)}>
          <div className="pe-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pe-modal-title">이메일 변경</div>

            <div className="pe-modal-row">
              <div className="pe-modal-label">수정 할 이메일</div>
              <div className="pe-modal-inline">
                <input
                  className="pe-input"
                  value={emailDraft}
                  onChange={(e) => {
                    setEmailDraft(e.target.value);
                    setEmailCheckStatus("idle");
                    setEmailCheckMsg("");
                  }}
                />
                <button
                  type="button"
                  className="pe-modal-btn pe-check-btn"
                  onClick={checkEmailDuplicate}
                >
                  중복확인
                </button>
              </div>
              {emailCheckMsg && (
                <div className={`pe-check-msg ${emailCheckStatus === "available" ? "ok" : "bad"}`}>
                  {emailCheckMsg}
                </div>
              )}
            </div>

            <div className="pe-modal-actions">
              <button className="pe-modal-btn pe-primary" onClick={applyEmailChange}>
                변경
              </button>
              <button className="pe-modal-btn" onClick={() => setIsEmailModalOpen(false)}>
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileEditPage;
