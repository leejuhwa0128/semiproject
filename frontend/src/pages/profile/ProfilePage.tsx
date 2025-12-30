import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../api/axios";
import "./ProfilePage.css";
import PostDetailModal from "../../components/PostDetailModal";
import FollowListModal from "../../components/FollowListModal";

interface UserProfile {
  userId: number;
  loginId: string;
  nickname: string;
  intro: string | null;
  profileImageUrl: string | null;
  postCount: number;
  followerCount: number;
  followingCount: number;

  // ✅ 다른 유저 프로필일 때: 내가 이 유저를 팔로우 중인지 (백엔드가 내려주면 사용)
  isFollowing?: boolean;
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

  // 더보기용 상태
  const [offset, setOffset] = useState(0);
  const [moreLoading, setMoreLoading] = useState(false);

  const [openPostId, setOpenPostId] = useState<number | null>(null);

  // ✅ 팔로우 버튼 상태
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  // ✅ 팔로워/팔로잉 목록 모달
  const [followModal, setFollowModal] = useState<null | "followers" | "following">(null);

  const BACKEND = "http://localhost:4000";
  const toUrl = (u: string) =>
    !u ? "" : u.startsWith("http") ? u : `${BACKEND}${u.startsWith("/") ? u : "/" + u}`;

  /* =========================
     ✅ 공통: "팔로우 상태 변경"을 ProfilePage 숫자에 즉시 반영
     - FollowListModal / PostDetailModal 둘 다 여기로 알림
  ========================= */
  type FollowChangedType = "toggleFollow" | "removeFollower";

const handleFollowChanged = (
  type: FollowChangedType,
  targetUserId: number,
  nowFollowing: boolean
) => {
  // ✅ 내 프로필일 때
  if (isMine) {
    if (type === "toggleFollow") {
      // 내가 누굴 팔로우/언팔 -> followingCount 변동
      const delta = nowFollowing ? 1 : -1;
      setUser((p) =>
        p ? { ...p, followingCount: Math.max(0, p.followingCount + delta) } : p
      );
    }

    if (type === "removeFollower") {
      // 누가 나를 팔로우하던 걸 삭제 -> followerCount 감소
      setUser((p) =>
        p ? { ...p, followerCount: Math.max(0, p.followerCount - 1) } : p
      );
    }

    return;
  }

  // ✅ 남의 프로필을 보고 있고, 그 프로필 주인을 팔로우/언팔한 경우
  if (!isMine && user && targetUserId === user.userId && type === "toggleFollow") {
    const delta = nowFollowing ? 1 : -1;

    setUser((p) =>
      p ? { ...p, followerCount: Math.max(0, p.followerCount + delta) } : p
    );
    setIsFollowing(nowFollowing);
  }
};

  /* =========================
     프로필 정보
  ========================= */
  useEffect(() => {
    if (!Number.isFinite(pageUserId)) return;

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const url = isMine ? "/api/users/me" : `/api/users/${pageUserId}`;
        const res = await api.get<UserProfile>(url);

        setUser(res.data);

        // ✅ 다른 유저 프로필이면 isFollowing 초기화
        if (!isMine) setIsFollowing(Boolean((res.data as any)?.isFollowing));
        else setIsFollowing(false);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [pageUserId, isMine]);

  /* =========================
     게시글 미디어 (초기 로드)
  ========================= */
  useEffect(() => {
    if (!Number.isFinite(pageUserId)) return;

    setMedia([]);
    setHasMore(false);
    setOffset(0);

    const fetchMedia = async () => {
      try {
        const url = isMine ? "/api/posts/my-media" : `/api/posts/user/${pageUserId}/media`;

        const res = await api.get<MediaResponse>(url, {
          params: { offset: 0, limit: PAGE_SIZE },
        });

        setMedia(res.data.items ?? []);
        setHasMore(res.data.hasMore);
        setOffset(res.data.items?.length ?? 0);
      } catch {
        setMedia([]);
        setHasMore(false);
        setOffset(0);
      }
    };

    fetchMedia();
  }, [pageUserId, isMine]);

  // ✅ 더보기
  const loadMore = async () => {
    if (moreLoading || !hasMore) return;

    setMoreLoading(true);
    try {
      const url = isMine ? "/api/posts/my-media" : `/api/posts/user/${pageUserId}/media`;

      const res = await api.get<MediaResponse>(url, {
        params: { offset, limit: PAGE_SIZE },
      });

      const nextItems = res.data.items ?? [];

      setMedia((prev) => {
        const existing = new Set(prev.map((x) => x.mediaId));
        const filtered = nextItems.filter((x) => !existing.has(x.mediaId));
        return [...prev, ...filtered];
      });

      setHasMore(res.data.hasMore);
      setOffset((prev) => prev + nextItems.length);
    } catch {
      setHasMore(false);
    } finally {
      setMoreLoading(false);
    }
  };

  // ✅ 프로필 상단 팔로우/언팔로우 버튼
  // ✅ 프로필 상단 팔로우 / 언팔로우 버튼
  const handleToggleFollow = async () => {
    if (!user || isMine || followLoading) return;

    const targetUserId = user.userId;

    const prev = isFollowing;
    const next = !prev;

    // ✅ optimistic UI
    setIsFollowing(next);
    setUser((p) =>
      p
        ? { ...p, followerCount: Math.max(0, p.followerCount + (next ? 1 : -1)) }
        : p
    );

    try {
      setFollowLoading(true);

      const res = await api.post(`/api/follows/toggle`, { targetUserId });
      const serverIsFollowing = Boolean(res.data?.isFollowing);

      // 서버 결과가 다르면 보정
      if (serverIsFollowing !== next) {
        setIsFollowing(serverIsFollowing);
        setUser((p) =>
          p
            ? {
              ...p,
              followerCount: Math.max(
                0,
                p.followerCount +
                (serverIsFollowing ? 1 : -1) +
                (next ? -1 : 1)
              ),
            }
            : p
        );
      }
    } catch (e) {
      // rollback
      setIsFollowing(prev);
      setUser((p) =>
        p
          ? { ...p, followerCount: Math.max(0, p.followerCount + (next ? -1 : 1)) }
          : p
      );
      console.error("팔로우 토글 실패:", e);
    } finally {
      setFollowLoading(false);
    }
  };



  if (loading) return <p>로딩중...</p>;
  if (!user) return <p>사용자를 찾을 수 없습니다.</p>;

  return (
    <div className="profile-page">
      {/* 상단 프로필 */}
      <div className="profile-header">
        <div className="profile-avatar-wrapper">
          <div className={user.profileImageUrl ? "profile-avatar has-image" : "profile-avatar no-image"}>
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

            <div onClick={() => setFollowModal("followers")} style={{ cursor: "pointer" }}>
              <span className="count-number">{user.followerCount}</span>
              <span className="count-label">팔로워</span>
            </div>

            <div onClick={() => setFollowModal("following")} style={{ cursor: "pointer" }}>
              <span className="count-number">{user.followingCount}</span>
              <span className="count-label">팔로우</span>
            </div>
          </div>

          <div className="profile-intro">
            <p>{user.intro || "소개글이 비어있습니다."}</p>
          </div>

          <div className="profile-buttons">
            {isMine ? (
              <button className="profile-btn" onClick={() => navigate("/profile/edit")}>
                프로필 편집
              </button>
            ) : (
              <button
                className={"profile-btn " + (isFollowing ? "following" : "")}
                onClick={handleToggleFollow}
                disabled={followLoading}
              >
                {followLoading ? "처리중..." : isFollowing ? "팔로잉" : "팔로우"}
              </button>
            )}

            <button className="profile-btn">감정 변경 내역</button>
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="profile-tabs">
        <button className="profile-tab active">게시글</button>
        <button className="profile-tab">스토리</button>
      </div>

      {/* 게시글 */}
      <div className="profile-content">
        <div className="profile-grid">
          {media.map((m) => (
            <div key={m.mediaId} className="profile-grid-item" onClick={() => setOpenPostId(m.postId)}>
              {m.mediaCount > 1 && <div className="profile-multi-icon">⧉</div>}
              <img src={toUrl(m.mediaUrl)} alt="" />
            </div>
          ))}
        </div>

        {hasMore && (
          <div className="profile-more">
            <button className="profile-more-btn" onClick={loadMore} disabled={moreLoading}>
              {moreLoading ? "불러오는 중..." : "더보기"}
            </button>
          </div>
        )}
      </div>

      {/* 게시글 상세 모달 */}
      {openPostId && (
        <PostDetailModal
          postId={openPostId}
          onClose={() => setOpenPostId(null)}
          onDeleted={(deletedPostId) => {
            // ✅ 1) 그리드에서 삭제된 게시글의 미디어 싹 제거
            setMedia((prev) => prev.filter((m) => m.postId !== deletedPostId));

            // ✅ 2) 모달 닫기
            setOpenPostId(null);

            // ✅ 3) 프로필 숫자(게시물 수) 즉시 감소
            setUser((p) =>
              p ? { ...p, postCount: Math.max(0, p.postCount - 1) } : p
            );
          }}
          // ✅ 추가: 모달(좋아요/팔로우 등)에서 팔로우 바뀌면 숫자 즉시 반영
          onFollowChanged={handleFollowChanged}
        />
      )}

      {/* ✅ 팔로워/팔로잉 목록 모달 */}
      {followModal && (
        <FollowListModal
          targetUserId={user.userId}
          mode={followModal}
          onClose={() => setFollowModal(null)}
          // ✅ 추가: 모달에서 팔로우 토글되면 숫자 즉시 반영
          onFollowChanged={handleFollowChanged}
        />
      )}
    </div>
  );
};



export default ProfilePage;
