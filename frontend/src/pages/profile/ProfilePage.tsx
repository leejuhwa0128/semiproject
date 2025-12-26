import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";
import "./ProfilePage.css";
import PostDetailModal from "../../components/PostDetailModal";

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

interface MyMediaItem {
  mediaId: number;
  postId: number;
  mediaUrl: string;
  mediaType?: string | null;
  createdAt: string;
  mediaCount: number;
}

interface MyMediaResponse {
  items: MyMediaItem[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

const PAGE_SIZE = 3;

const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const navigate = useNavigate();

  // ✅ 내 게시글 대표사진 상태
  const [mediaItems, setMediaItems] = useState<MyMediaItem[]>([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaHasMore, setMediaHasMore] = useState(false);

  // ✅ 모달 상태
  const [openPostId, setOpenPostId] = useState<number | null>(null);

  const BACKEND = "http://localhost:4000";
  const toImageUrl = (url: string) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    return `${BACKEND}${url.startsWith("/") ? url : `/${url}`}`;
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/api/users/me");
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

  // ✅ 첫 페이지 로드
  useEffect(() => {
    const fetchFirstMedia = async () => {
      try {
        setMediaLoading(true);
        const res = await api.get<MyMediaResponse>("/api/posts/my-media", {
          params: { offset: 0, limit: PAGE_SIZE },
        });
        setMediaItems(res.data.items ?? []);
        setMediaHasMore(Boolean(res.data.hasMore));
      } catch (e) {
        console.error("❌ 내 게시글 사진 불러오기 실패:", e);
        setMediaItems([]);
        setMediaHasMore(false);
      } finally {
        setMediaLoading(false);
      }
    };
    fetchFirstMedia();
  }, []);

  const handleLoadMore = async () => {
    if (mediaLoading) return;

    try {
      setMediaLoading(true);
      const nextOffset = mediaItems.length;

      const res = await api.get<MyMediaResponse>("/api/posts/my-media", {
        params: { offset: nextOffset, limit: PAGE_SIZE },
      });

      const next = res.data.items ?? [];
      setMediaItems((prev) => [...prev, ...next]);
      setMediaHasMore(Boolean(res.data.hasMore));
    } catch (e) {
      console.error("❌ 더보기 실패:", e);
    } finally {
      setMediaLoading(false);
    }
  };

  if (loading) return <p>로딩 중...</p>;
  if (errorMsg) return <p>{errorMsg}</p>;
  if (!user) return <p>사용자 정보를 불러올 수 없습니다.</p>;

  const introText =
    user.intro && user.intro.trim().length > 0
      ? user.intro
      : "소개글이 비어있습니다.";

  return (
    <div className="profile-page">
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
              <img src={toImageUrl(user.profileImageUrl)} alt="프로필" />
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
            <p>{introText}</p>
          </div>

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

      <div className="profile-tabs">
        <button className="profile-tab active">게시글</button>
        <button className="profile-tab">스토리</button>
      </div>

      <div className="profile-content">
        {mediaItems.length === 0 && !mediaLoading ? (
          <p>아직 업로드한 사진 게시글이 없습니다.</p>
        ) : (
          <>
            <div className="profile-grid">
              {mediaItems.map((m) => (
                <div
                  key={m.mediaId}
                  className="profile-grid-item"
                  onClick={() => setOpenPostId(m.postId)} // ✅ 클릭 → 모달 오픈
                  role="button"
                  tabIndex={0}
                >
                  {m.mediaCount > 1 && (
                    <div className="profile-multi-icon" title="여러 장">
                      ⧉
                    </div>
                  )}

                  <img src={toImageUrl(m.mediaUrl)} alt={`post-${m.postId}`} />
                </div>
              ))}
            </div>

            {mediaHasMore && (
              <div className="profile-loadmore-wrap">
                <button
                  className="profile-loadmore-btn"
                  onClick={handleLoadMore}
                  disabled={mediaLoading}
                >
                  {mediaLoading ? "불러오는 중..." : "더보기"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ✅ 상세 모달 */}
      {openPostId != null && (
        <PostDetailModal postId={openPostId} onClose={() => setOpenPostId(null)} />
      )}
    </div>
  );
};

export default ProfilePage;
