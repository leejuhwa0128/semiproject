import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import "./ProfileEditPage.css";

interface UserMeResponse {
  userId?: number; // ✅ (가능하면 백엔드에서 내려주기)
  nickname: string;
  email: string;
  intro?: string | null;
  profileImageUrl?: string | null;
}

const BACKEND = "http://localhost:4000";
const toUrl = (url: string) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${BACKEND}${url.startsWith("/") ? url : `/${url}`}`;
};

const ProfileEditPage: React.FC = () => {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [originalNickname, setOriginalNickname] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  // ✅ 선택한 파일/미리보기 상태
  const [selectedProfileFile, setSelectedProfileFile] = useState<File | null>(null);
  const [profilePreviewUrl, setProfilePreviewUrl] = useState<string | null>(null);

  const [formNickname, setFormNickname] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [intro, setIntro] = useState("");
  const [isIntroNull, setIsIntroNull] = useState(true);

  const [isNicknameModalOpen, setIsNicknameModalOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  const [nicknameDraft, setNicknameDraft] = useState("");
  const [emailDraft, setEmailDraft] = useState("");

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

  // ✅ 미리보기 URL 해제(메모리 누수 방지)
  useEffect(() => {
    return () => {
      if (profilePreviewUrl) URL.revokeObjectURL(profilePreviewUrl);
    };
  }, [profilePreviewUrl]);

  /** ✅ 사진 변경 버튼 -> 파일 선택 열기 */
  const openFilePicker = () => {
    fileRef.current?.click();
  };

  /** ✅ 파일 선택 시 미리보기 적용 */
  const handlePickProfileImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    // 간단 검증(원하면 강화 가능)
    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 선택할 수 있어요.");
      e.target.value = "";
      return;
    }

    setSelectedProfileFile(file);

    // 기존 preview url revoke 후 새로 생성
    if (profilePreviewUrl) URL.revokeObjectURL(profilePreviewUrl);
    const preview = URL.createObjectURL(file);
    setProfilePreviewUrl(preview);
  };

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

    // ✅ 사진까지 같이 보내려면 FormData로 처리하는 게 깔끔함
    const fd = new FormData();
    fd.append("nickname", formNickname);
    fd.append("email", formEmail);
    fd.append("intro", intro);

    if (selectedProfileFile) {
      fd.append("profileImage", selectedProfileFile);
    }

    // 서버에서 업데이트된 profileImageUrl을 내려주게 만들면 베스트
    const res = await api.put("/api/users/me", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    // 예: res.data.profileImageUrl
    if (res.data?.profileImageUrl) {
      setProfileImageUrl(res.data.profileImageUrl);
      setSelectedProfileFile(null);
      if (profilePreviewUrl) URL.revokeObjectURL(profilePreviewUrl);
      setProfilePreviewUrl(null);
    }

    alert("프로필이 저장되었습니다.");
    navigate(-1);
  };

  const avatarSrc = profilePreviewUrl
    ? profilePreviewUrl
    : profileImageUrl
      ? toUrl(profileImageUrl)
      : "";

  return (
    <div className="pe-page">
      <div className="pe-wrap">
        <h1 className="pe-title">프로필 편집</h1>

        <form onSubmit={handleSubmit} className="pe-form">
          {/* ✅ 숨김 파일 인풋 */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handlePickProfileImage}
          />

          {/* 콜아웃 */}
          <div className="pe-card pe-callout">
            <div className="pe-avatar">
              {avatarSrc ? (
                <img src={avatarSrc} alt="프로필" />
              ) : (
                <div className="pe-avatar-placeholder">?</div>
              )}
            </div>

            <div className="pe-mid">
              <div className="pe-loginId">{originalNickname}</div>
            </div>

            <div className="pe-right">
              <button
                type="button"
                className="pe-photo-btn"
                onClick={openFilePicker}
              >
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
            <button type="button" className="pe-cancel" onClick={() => navigate(-1)}>
              취소
            </button>
          </div>
        </form>
      </div>

      {/* ... (닉네임/이메일 모달은 그대로) */}
    </div>
  );
};

export default ProfileEditPage;
