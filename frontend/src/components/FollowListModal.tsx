import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import "./FollowListModal.css";

export interface FollowUserItem {
  userId: number;
  nickname: string;
  loginId?: string;
  profileImageUrl: string | null;
  isFollowing: boolean;
}

type FollowChangedType = "toggleFollow" | "removeFollower";

type Props = {
  targetUserId: number;
  mode: "followers" | "following";
  onClose: () => void;
  onFollowChanged?: (type: FollowChangedType, targetUserId: number, nowFollowing: boolean) => void;
};

const BACKEND = "http://localhost:4000";
const toUrl = (url: string) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${BACKEND}${url.startsWith("/") ? url : `/${url}`}`;
};

const getMyUserId = () => {
  const v = localStorage.getItem("userId");
  const id = v ? Number(v) : NaN;
  return Number.isFinite(id) ? id : null;
};

const PAGE_SIZE = 50;

const FollowListModal: React.FC<Props> = ({
  targetUserId,
  mode,
  onClose,
  onFollowChanged,
}) => {
  const navigate = useNavigate();
  const myId = getMyUserId();

  const [items, setItems] = useState<FollowUserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState<Set<number>>(new Set()); // ✅ 중복 클릭 방지

  const title = mode === "followers" ? "팔로워" : "팔로잉";

  const fetchList = async () => {
    setLoading(true);
    try {
      const url =
        mode === "followers"
          ? `/api/users/${targetUserId}/followers`
          : `/api/users/${targetUserId}/following`;

      const res = await api.get<{ items: FollowUserItem[]; hasMore: boolean }>(
        url,
        { params: { offset: 0, limit: PAGE_SIZE } }
      );

      setItems(res.data.items ?? []);
    } catch (e) {
      console.error("팔로우 목록 로드 실패:", e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUserId, mode]);

  const goProfile = (userId: number) => {
    onClose();
    navigate(`/profile/${userId}`);
  };

  // ✅ (기존) 팔로우 토글: 팔로잉/팔로워 목록에서 버튼 눌러 내 팔로우 상태 변경
  const handleToggleFollow = async (targetId: number) => {
    if (!myId || myId === targetId) return;
    if (busyIds.has(targetId)) return;

    const prevIsFollowing =
      items.find((u) => u.userId === targetId)?.isFollowing ?? false;
    const optimisticNext = !prevIsFollowing;

    setBusyIds((s) => new Set(s).add(targetId));

    // optimistic
    setItems((prev) =>
      prev.map((u) =>
        u.userId === targetId ? { ...u, isFollowing: optimisticNext } : u
      )
    );

    try {
      const res = await api.post(`/api/follows/toggle`, { targetUserId: targetId });
      const serverIsFollowing = Boolean(res.data?.isFollowing);

      setItems((prev) =>
        prev.map((u) =>
          u.userId === targetId ? { ...u, isFollowing: serverIsFollowing } : u
        )
      );

      onFollowChanged?.("toggleFollow", targetId, serverIsFollowing);
    } catch (e) {
      console.error("팔로우 토글 실패:", e);
      setItems((prev) =>
        prev.map((u) =>
          u.userId === targetId ? { ...u, isFollowing: prevIsFollowing } : u
        )
      );
    } finally {
      setBusyIds((s) => {
        const next = new Set(s);
        next.delete(targetId);
        return next;
      });
    }
  };

  // ✅ (추가) 팔로워 삭제: followers 모달에서만 X로 “상대가 나를 팔로우한 관계” 끊기
  const handleRemoveFollower = async (followerUserId: number) => {
    if (!myId) return;                 // 로그인 필수
    if (mode !== "followers") return;  // 팔로워 모달에서만
    if (targetUserId !== myId) {
      // 내 프로필에서만 “내 팔로워 삭제”가 의미 있음
      alert("내 팔로워 목록에서만 삭제할 수 있습니다.");
      return;
    }
    if (busyIds.has(followerUserId)) return;

    setBusyIds((s) => new Set(s).add(followerUserId));

    // optimistic: 목록에서 제거
    const prevItems = items;
    setItems((prev) => prev.filter((u) => u.userId !== followerUserId));

    try {
      await api.delete(`/api/follows/followers/${followerUserId}`);

      // ✅ ProfilePage followerCount 즉시 -1
      // targetUserId(=내 userId)의 followerCount를 줄여야 하므로
      // 여기서는 “내가 그 유저를 팔로우중인가”가 아니라 “팔로워 한 명이 제거됨” 이벤트야.
      // ProfilePage에서 delta 계산을 nowFollowing 기반으로 했으니,
      // followerCount 감소를 유도하려면 nowFollowing=false로 보내면 delta=-1 됨.
      onFollowChanged?.("removeFollower", followerUserId, false);
    } catch (e) {
      console.error("팔로워 삭제 실패:", e);
      // rollback
      setItems(prevItems);
      alert("팔로워 삭제 실패");
    } finally {
      setBusyIds((s) => {
        const next = new Set(s);
        next.delete(followerUserId);
        return next;
      });
    }
  };

  return (
    <div className="flm-backdrop" onClick={onClose}>
      <div className="flm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="flm-header">
          <b>{title}</b>
          <button className="flm-close" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        {loading ? (
          <div className="flm-loading">불러오는 중...</div>
        ) : items.length === 0 ? (
          <div className="flm-empty">목록이 없습니다.</div>
        ) : (
          <div className="flm-list">
            {items.map((u) => (
              <div key={u.userId} className="flm-row">
                <img
                  className="flm-avatar"
                  src={u.profileImageUrl ? toUrl(u.profileImageUrl) : "/default-avatar.png"}
                  alt=""
                />

                <div className="flm-meta">
                  <div className="flm-nick clickable" onClick={() => goProfile(u.userId)}>
                    {u.nickname}
                  </div>
                </div>

                {/* ✅ 오른쪽 액션들 */}
                <div className="flm-actions">
                  {/* ✅ 내 자신이면 팔로우 버튼 숨김 */}
                  {myId !== u.userId && (
                    <button
                      className={"flm-follow-btn " + (u.isFollowing ? "following" : "")}
                      onClick={() => handleToggleFollow(u.userId)}
                      type="button"
                      disabled={busyIds.has(u.userId)}
                    >
                      {u.isFollowing ? "팔로잉" : "팔로우"}
                    </button>
                  )}

                  {/* ✅ followers 모달에서만 X 표시 + 내 프로필일 때만 의미있게 동작 */}
                  {mode === "followers" && myId === targetUserId && myId !== u.userId && (
                    <button
                      className="flm-remove-btn"
                      onClick={() => handleRemoveFollower(u.userId)}
                      type="button"
                      aria-label="팔로워 삭제"
                      disabled={busyIds.has(u.userId)}
                      title="팔로워 삭제"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FollowListModal;
