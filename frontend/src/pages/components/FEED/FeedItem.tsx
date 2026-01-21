import React, { useEffect, useState } from "react";
import api from "../../../api/axios";
import "./Feed.css";

type FeedItemProps = {
  item: {
    type: "POST" | "STORY";
    id: number;
    content: string;
    emotion: number;

    authorNickname: string;
    authorProfileUrl: string | null;
    mediaUrls?: string[];

    likeCount?: number;
    isLiked?: boolean;
  };

  // 댓글 모달 열기
  onOpenDetail?: (postId: number) => void;
};

export default function FeedItem({ item, onOpenDetail }: FeedItemProps) {
  const profileSrc = item.authorProfileUrl
    ? `http://localhost:4000${item.authorProfileUrl}`
    : "/default-profile.png";

  const mediaUrls = item.mediaUrls ?? [];
  const [currentImg, setCurrentImg] = useState(0);

  /* =========================
     좋아요 상태 (local state)
  ========================= */
  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [likeCount, setLikeCount] = useState<number>(0);
  const [likeLoading, setLikeLoading] = useState(false);

  /* 🔥 props → state 동기화
     (새로고침 / 피드 재조회 시 핵심)
  */
  useEffect(() => {
    setIsLiked(Boolean(item.isLiked));
    setLikeCount(item.likeCount ?? 0);
  }, [item.isLiked, item.likeCount]);

  /* =========================
     이미지 슬라이더
  ========================= */
  const prevImage = () => {
    if (currentImg > 0) setCurrentImg((p) => p - 1);
  };

  const nextImage = () => {
    if (currentImg < mediaUrls.length - 1) setCurrentImg((p) => p + 1);
  };

  /* =========================
     좋아요 토글
  ========================= */
  const handleToggleLike = async () => {
    if (likeLoading || item.type !== "POST") return;

    const prevLiked = isLiked;
    const prevCount = likeCount;

    const nextLiked = !prevLiked;
    const nextCount = Math.max(0, prevCount + (nextLiked ? 1 : -1));

    // optimistic UI
    setIsLiked(nextLiked);
    setLikeCount(nextCount);

    try {
      setLikeLoading(true);

      const res = await api.post(`/api/posts/${item.id}/like`);

      setIsLiked(Boolean(res.data?.isLiked));
      setLikeCount(Number(res.data?.likeCount ?? nextCount));
    } catch (e) {
      console.error("좋아요 실패:", e);
      setIsLiked(prevLiked);
      setLikeCount(prevCount);
    } finally {
      setLikeLoading(false);
    }
  };

  return (
    <div className="feed-item">
      {/* ===== 헤더 ===== */}
      <div className="feed-header">
        <div className="feed-header-left">
          <img src={profileSrc} alt="profile" className="feed-profile" />
          <div className="feed-user">
            <span className="feed-nickname">{item.authorNickname}</span>
            <span className="feed-emotion">
              감정: {item.emotion.toFixed(1)}
            </span>
          </div>
        </div>
        <span className="feed-type">{item.type}</span>
      </div>

      {/* ===== 이미지 ===== */}
      {mediaUrls.length > 0 && (
        <div className="feed-slider">
          <img
            src={`http://localhost:4000${mediaUrls[currentImg]}`}
            alt=""
            className="feed-image"
          />

          {mediaUrls.length > 1 && (
            <>
              {currentImg > 0 && (
                <button className="feed-nav prev" onClick={prevImage}>
                  ‹
                </button>
              )}
              {currentImg < mediaUrls.length - 1 && (
                <button className="feed-nav next" onClick={nextImage}>
                  ›
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* ===== 액션 영역 (POST만) ===== */}
      {item.type === "POST" && (
        <div className="feed-actions">
          <button
            className={`feed-like-btn ${isLiked ? "liked" : ""}`}
            onClick={handleToggleLike}
            disabled={likeLoading}
          >
            {isLiked ? "♥" : "♡"}
          </button>

          <button
            className="feed-comment-btn"
            onClick={() => onOpenDetail?.(item.id)}
          >
            💬
          </button>
        </div>
      )}

      {/* ===== 좋아요 수 ===== */}
      {item.type === "POST" && (
        <div className="feed-like-count">
          {likeCount > 0
            ? `좋아요 ${likeCount}개`
            : "가장 먼저 좋아요를 눌러보세요"}
        </div>
      )}

      {/* ===== 글 내용 ===== */}
      {item.type === "POST" ? (
        <div className="feed-caption">
          <b>{item.authorNickname}</b> {item.content}
        </div>
      ) : (
        <div className="feed-caption">{item.content}</div>
      )}
    </div>
  );
}
