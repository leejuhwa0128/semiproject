import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
import "./ProfilePage.css";
import PostDetailModal from "../../components/PostDetailModal";

interface UserProfile {
  userId: number;
  loginId: string;
  nickname: string;
  intro: string | null;
  profileImageUrl: string | null;
  postCount: number;
  followerCount: number;
  followingCount: number;
}

interface MediaItem {
  mediaId: number;
  postId: number;
  mediaUrl: string;
  mediaCount: number;
}

interface MediaResponse {
  items: MediaItem[];
  hasMore: boolean;
}

const PAGE_SIZE = 3;

const getMyUserId = () => {
  const v = localStorage.getItem("userId");
  const id = v ? Number(v) : NaN;
  return Number.isFinite(id) ? id : null;
};

const ProfilePage: React.FC = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  const myId = getMyUserId();
  const pageUserId = Number(userId);
  const isMine = myId === pageUserId;

  const [user, setUser] = useState<UserProfile | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openPostId, setOpenPostId] = useState<number | null>(null);

  const BACKEND = "http://localhost:4000";
  const toUrl = (u: string) =>
    !u ? "" : u.startsWith("http") ? u : `${BACKEND}${u.startsWith("/") ? u : "/" + u}`;

  /* =========================
     프로필 정보
  ========================= */
  useEffect(() => {
    if (!Number.isFinite(pageUserId)) return;

    const fetchProfile = async () => {
      try {
        const url = isMine ? "/api/users/me" : `/api/users/${pageUserId}`;
        const res = await api.get<UserProfile>(url);
        setUser(res.data);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [pageUserId, isMine]);

  /* =========================
     게시글 미디어
  ========================= */
  useEffect(() => {
    if (!Number.isFinite(pageUserId)) return;

    const fetchMedia = async () => {
      try {
        const url = isMine
          ? "/api/posts/my-media"
          : `/api/posts/user/${pageUserId}/media`;

        const res = await api.get<MediaResponse>(url, {
  params: isMine
    ? { userId: myId, offset: 0, limit: PAGE_SIZE }   // 🔥 여기
    : { offset: 0, limit: PAGE_SIZE },
});


        setMedia(res.data.items ?? []);
        setHasMore(res.data.hasMore);
      } catch {
        setMedia([]);
        setHasMore(false);
      }
    };

    fetchMedia();
  }, [pageUserId, isMine]);

  if (loading) return <p>로딩중...</p>;
  if (!user) return <p>사용자를 찾을 수 없습니다.</p>;

  return (
    <div className="profile-page">
      {/* =========================
         상단 프로필 영역
         ========================= */}
      <div className="profile-header">
        <div className="profile-avatar-wrapper">
          <div
            className={
              user.profileImageUrl
                ? "profile-avatar has-image"
                : "profile-avatar no-image"
            }
          >
            {user.profileImageUrl ? (
              <img src={toUrl(user.profileImageUrl)} alt="프로필" />
            ) : (
              <span className="avatar-placeholder">?</span>
            )}
          </div>
        </div>

        <div className="profile-info">
          <div className="profile-top-row">
            <span className="profile-login-id">{user.nickname}</span>
          </div>

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

          <div className="profile-intro">
            <p>{user.intro || "소개글이 비어있습니다."}</p>
          </div>

          <div className="profile-buttons">
            {isMine && (
              <button
                className="profile-btn"
                onClick={() => navigate("/profile/edit")}
              >
                프로필 편집
              </button>
            )}
            <button className="profile-btn">감정 변경 내역</button>
          </div>
        </div>
      </div>

      {/* =========================
         탭 영역
         ========================= */}
      <div className="profile-tabs">
        <button className="profile-tab active">게시글</button>
        <button className="profile-tab">스토리</button>
      </div>

      {/* =========================
         게시글 그리드
         ========================= */}
      <div className="profile-content">
        <div className="profile-grid">
          {media.map((m) => (
            <div
              key={m.mediaId}
              className="profile-grid-item"
              onClick={() => setOpenPostId(m.postId)}
            >
              {m.mediaCount > 1 && (
                <div className="profile-multi-icon">⧉</div>
              )}
              <img src={toUrl(m.mediaUrl)} alt="" />
            </div>
          ))}
        </div>
      </div>

      {/* =========================
         게시글 상세 모달
         ========================= */}
      {openPostId && (
        <PostDetailModal
          postId={openPostId}
          onClose={() => setOpenPostId(null)}
        />
      )}
    </div>
  );
};

export default ProfilePage;
