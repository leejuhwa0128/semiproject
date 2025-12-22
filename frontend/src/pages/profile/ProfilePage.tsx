import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import "./ProfilePage.css";

interface UserProfile {
  userId: number;
  loginId: string;
  nickname: string;
  email: string;
  currentEmotionId: number | null;
  postCount: number;
  followerCount: number;
  followingCount: number;
  intro: string | null;
  profileImageUrl: string | null;
}

const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/api/users/me");

        console.log("📌 프로필 데이터:", res.data);

        setUser(res.data);
      } catch (err) {
        console.error("❌ 프로필 불러오기 오류:", err);
        setErrorMsg("사용자 정보를 불러올 수 없습니다.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  if (loading) return <p>로딩 중...</p>;
  if (errorMsg) return <p>{errorMsg}</p>;
  if (!user) return <p>사용자 정보를 불러올 수 없습니다.</p>;

  const introText =
    user.intro && user.intro.trim().length > 0
      ? user.intro
      : "소개글이 비어있습니다.";

  return (
    <div className="profile-page">

      {/* 상단 프로필 영역 */}
      <div className="profile-header">
        {/* 프로필 사진 */}
        <div className="profile-avatar-wrapper">
          <div
            className={
              user.profileImageUrl
                ? "profile-avatar has-image"
                : "profile-avatar no-image"
            }
          >
            {user.profileImageUrl ? (
              <img src={user.profileImageUrl} alt="프로필" />
            ) : (
              <span className="avatar-placeholder">?</span>
            )}
          </div>
        </div>

        {/* 오른쪽 정보 */}
        <div className="profile-info">
          <div className="profile-top-row">
            <span className="profile-login-id">{user.nickname}</span>
            <button className="profile-icon-btn">⚙️</button>
          </div>

          {/* 게시물/팔로워/팔로우 */}
          <div className="profile-counts">
            <div>
              <span className="count-number">{user.postCount}</span>
              <span className="count-label">게시물</span>
            </div>
            <div>
              <span className="count-number">{user.followerCount}</span>
              <span className="count-label">팔로워</span>
            </div>
            <div>
              <span className="count-number">{user.followingCount}</span>
              <span className="count-label">팔로우</span>
            </div>
          </div>

          {/* 소개글 */}
          <div className="profile-intro">
            <p>{introText}</p>
          </div>

          {/* 버튼들 */}
          <div className="profile-buttons">
            <button
              className="profile-btn"
              onClick={() => navigate("/profile/edit")}
            >
              프로필 편집
            </button>
            <button className="profile-btn">감정 변경 내역</button>
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="profile-tabs">
        <button className="profile-tab active">게시글</button>
        <button className="profile-tab">스토리</button>
      </div>

      <div className="profile-content">
        <p>여기에 사용자의 게시글 목록 / 스토리 내용을 표시할 예정입니다.</p>
      </div>
    </div>
  );
};

export default ProfilePage;
