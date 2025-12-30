import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import "./PostDetailModal.css";

interface PostDetailMedia {
  mediaId: number;
  mediaUrl: string;
  mediaType?: string | null;
  createdAt: string;
}

interface PostDetailResponse {
  postId: number;
  userId: number;
  nickname: string;
  profileImageUrl: string | null;
  content: string;
  createdAt: string;
  media: PostDetailMedia[];

  likeCount: number;
  isLiked: boolean;

  latestLiker: { userId: number; nickname: string; profileImageUrl: string | null } | null;
}

interface CommentItem {
  commentId: number;
  userId: number;
  nickname: string;
  profileImageUrl: string | null;
  content: string;
  createdAt: string;
  parentCommentId: number | null;
  isDeleted?: boolean; // ✅ 서버가 내려주면 사용 (Y/N이면 변환해서 내려주는 걸 추천)
  children?: CommentItem[];
}

interface LikerItem {
  userId: number;
  nickname: string;
  loginId?: string;
  profileImageUrl: string | null;
  isFollowing: boolean;
}

type Props = {
  postId: number;
  onClose: () => void;
};

const BACKEND = "http://localhost:4000";
const toUrl = (url: string) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${BACKEND}${url.startsWith("/") ? url : `/${url}`}`;
};

const formatDateTimeShort = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");

  return `${yy}/${mm}/${dd} ${hh}:${min}`;
};

const PostDetailModal: React.FC<Props> = ({ postId, onClose }) => {
  const navigate = useNavigate();

  const [data, setData] = useState<PostDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [idx, setIdx] = useState(0);

  // ✅ 좋아요
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [likeLoading, setLikeLoading] = useState(false);

  // ✅ 댓글
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentLoading, setCommentLoading] = useState(false);
  const [newComment, setNewComment] = useState("");

  // ✅ 좋아요 누른 사람 목록
  const [likeListOpen, setLikeListOpen] = useState(false);
  const [likers, setLikers] = useState<LikerItem[]>([]);
  const [likersLoading, setLikersLoading] = useState(false);

  // ✅ 댓글 메뉴/삭제
  const [menuTarget, setMenuTarget] = useState<CommentItem | null>(null);

  // ✅ 프로필 이동 (모달 닫고 이동)
  const goProfile = (userId: number) => {
    onClose();
    navigate(`/profile/${userId}`);
  };

  // ✅ 게시글/댓글 로드
  useEffect(() => {
    let mounted = true;

    const fetch = async () => {
      try {
        setLoading(true);

        const res = await api.get<PostDetailResponse>(`/api/posts/${postId}`);
        if (!mounted) return;

        setData(res.data);
        setIdx(0);
        setLikeCount(res.data.likeCount ?? 0);
        setIsLiked(Boolean(res.data.isLiked));

        setCommentLoading(true);
        const cRes = await api.get<{ items: CommentItem[] }>(`/api/posts/${postId}/comments`);
        if (!mounted) return;

        // ✅ 삭제된 댓글은 아예 숨김
        const items = (cRes.data.items ?? []).filter((c) => !c.isDeleted);
        setComments(items);
      } catch (e) {
        console.error("게시글 상세/댓글 불러오기 실패:", e);
        if (!mounted) return;
        setData(null);
        setComments([]);
      } finally {
        if (mounted) {
          setLoading(false);
          setCommentLoading(false);
        }
      }
    };

    fetch();
    return () => {
      mounted = false;
    };
  }, [postId]);

  const media = useMemo(() => data?.media ?? [], [data]);
  const hasPrev = idx > 0;
  const hasNext = idx < media.length - 1;

  // ✅ 좋아요 토글
  const handleToggleLike = async () => {
    if (!data || likeLoading) return;

    const prevLiked = isLiked;
    const prevCount = likeCount;

    const nextLiked = !prevLiked;
    const nextCount = Math.max(0, prevCount + (nextLiked ? 1 : -1));

    setIsLiked(nextLiked);
    setLikeCount(nextCount);

    try {
      setLikeLoading(true);
      const res = await api.post(`/api/posts/${data.postId}/like`);
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

  // ✅ 좋아요 목록 로드
  useEffect(() => {
    if (!likeListOpen || !data) return;

    (async () => {
      try {
        setLikersLoading(true);
        const res = await api.get<{ items: LikerItem[] }>(`/api/posts/${data.postId}/likes/users`, {
          params: { limit: 50, offset: 0 },
        });
        setLikers(res.data.items ?? []);
      } catch (e) {
        console.error("좋아요 유저 목록 로드 실패:", e);
        setLikers([]);
      } finally {
        setLikersLoading(false);
      }
    })();
  }, [likeListOpen, data]);

  // ✅ 팔로우 토글
  const handleToggleFollow = async (targetUserId: number) => {
    try {
      const res = await api.post(`/api/follows/toggle`, { targetUserId });
      const isFollowing = Boolean(res.data?.isFollowing);
      setLikers((prev) => prev.map((u) => (u.userId === targetUserId ? { ...u, isFollowing } : u)));
    } catch (e) {
      console.error("팔로우 토글 실패:", e);
    }
  };

  // ✅ 댓글 작성
  const handleSubmitComment = async () => {
    if (!data) return;
    const content = newComment.trim();
    if (!content) return;

    try {
      const res = await api.post<CommentItem>(`/api/posts/${data.postId}/comments`, { content });

      // ✅ 삭제된 댓글이면 추가 안 함
      if (!res.data?.isDeleted) setComments((prev) => [...prev, res.data]);

      setNewComment("");
    } catch (e: any) {
      console.error("댓글 작성 실패:", e?.response?.status, e?.response?.data || e);
      alert(e?.response?.data?.message ?? "댓글 작성 실패(서버)");
    }
  };

  // ✅ 댓글 삭제 (서버 연결되어 있으면 작동)
  const handleDeleteComment = async () => {
    if (!data || !menuTarget) return;

    try {
      await api.delete(`/api/posts/${data.postId}/comments/${menuTarget.commentId}`);

      // ✅ UI에서 제거(삭제된 댓글 안 보이게)
      setComments((prev) => prev.filter((c) => c.commentId !== menuTarget.commentId));
      setMenuTarget(null);
    } catch (e: any) {
      console.error("댓글 삭제 실패:", e?.response?.data || e);
      alert(e?.response?.data?.message ?? "댓글 삭제 실패");
    }
  };

  const latestLikerNickname = useMemo(() => {
    const fromDetail = data?.latestLiker?.nickname;
    const fromList = likers?.[0]?.nickname;
    return fromDetail || fromList || "";
  }, [data?.latestLiker?.nickname, likers]);

  // ESC/좌우
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && hasPrev) setIdx((p) => p - 1);
      if (e.key === "ArrowRight" && hasNext) setIdx((p) => p + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, hasPrev, hasNext]);

  return (
    <div className="pdm-backdrop" onClick={onClose}>
      <div className="pdm-modal" onClick={(e) => e.stopPropagation()}>
        <button className="pdm-close" onClick={onClose} aria-label="닫기">
          ×
        </button>

        {loading ? (
          <div className="pdm-loading">불러오는 중...</div>
        ) : !data ? (
          <div className="pdm-loading">게시글을 불러올 수 없습니다.</div>
        ) : (
          <div className="pdm-body">
            {/* 왼쪽 이미지 */}
            <div className="pdm-left">
              <div className="pdm-image-wrap">
                {media.length > 0 ? (
                  <img className="pdm-image" src={toUrl(media[idx].mediaUrl)} alt={`media-${media[idx].mediaId}`} />
                ) : (
                  <div className="pdm-empty">이미지가 없습니다.</div>
                )}

                {media.length > 1 && (
                  <>
                    <button className="pdm-nav pdm-prev" onClick={() => hasPrev && setIdx((p) => p - 1)} disabled={!hasPrev}>
                      ‹
                    </button>
                    <button className="pdm-nav pdm-next" onClick={() => hasNext && setIdx((p) => p + 1)} disabled={!hasNext}>
                      ›
                    </button>

                    <div className="pdm-dots">
                      {media.map((m, i) => (
                        <button key={m.mediaId} className={"pdm-dot " + (i === idx ? "active" : "")} onClick={() => setIdx(i)} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* 오른쪽 */}
            <div className="pdm-right insta-right">
              {/* 상단: 유저 + 날짜 */}
              <div className="pdm-user">
                <div className="pdm-avatar">
                  {data.profileImageUrl ? <img src={toUrl(data.profileImageUrl)} alt="프로필" /> : <div className="pdm-avatar-placeholder">?</div>}
                </div>

                <div className="pdm-user-meta">
                  <div className="pdm-nickname clickable" onClick={() => goProfile(data.userId)}>
                    {data.nickname}
                  </div>
                  <div className="pdm-date-only">{formatDateTimeShort(data.createdAt)}</div>
                </div>
              </div>

              {/* 본문(고정) */}
              <div className="pdm-content">{data.content?.trim()?.length ? data.content : "내용이 없습니다."}</div>

              {/* 댓글(스크롤) */}
              <div className="pdm-comments-scroll">
                {commentLoading ? (
                  <div className="pdm-comments-loading">댓글 불러오는 중...</div>
                ) : comments.length === 0 ? (
                  <div className="pdm-comments-empty">아직 댓글이 없습니다.</div>
                ) : (
                  comments.map((c) => (
                    <div key={c.commentId} className="pdm-comment">
                      <div className="pdm-comment-avatar">
                        {c.profileImageUrl ? <img src={toUrl(c.profileImageUrl)} alt="" /> : <div className="pdm-avatar-placeholder small">?</div>}
                      </div>

                      <div className="pdm-comment-body">
                        <div className="pdm-comment-line">
                          <b className="pdm-comment-nick clickable" onClick={() => goProfile(c.userId)}>
                            {c.nickname}
                          </b>
                          <span className="pdm-comment-text">{c.content}</span>

                          <button className="pdm-comment-more" onClick={() => setMenuTarget(c)} aria-label="댓글 메뉴">
                            ⋯
                          </button>
                        </div>

                        <div className="pdm-comment-sub">{formatDateTimeShort(c.createdAt)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* 하단(고정) */}
              <div className="pdm-bottom">
                <div className="pdm-actions">
                  <button className={"pdm-like-btn " + (isLiked ? "liked" : "")} onClick={handleToggleLike} disabled={likeLoading} aria-label="좋아요">
                    {isLiked ? "♥" : "♡"}
                  </button>

                  <div className="pdm-like-summary">
                    {likeCount === 0 ? (
                      <span className="pdm-like-empty">가장 먼저 좋아요를 눌러보세요</span>
                    ) : (
                      <button className="pdm-like-summary-btn" onClick={() => setLikeListOpen(true)}>
                        <b>{latestLikerNickname || "누군가"}</b>
                        {likeCount <= 1 ? <>님이 좋아합니다</> : <>님 외 <b>{likeCount - 1}</b>명이 좋아합니다</>}
                      </button>
                    )}
                  </div>
                </div>

                <div className="pdm-comment-input">
                  <input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="댓글 달기..." />
                  <button onClick={handleSubmitComment} disabled={!newComment.trim()}>
                    게시
                  </button>
                </div>
              </div>

              {/* 좋아요 유저 목록 모달 */}
              {likeListOpen && (
                <div className="pdm-likeusers-backdrop" onClick={() => setLikeListOpen(false)}>
                  <div className="pdm-likeusers" onClick={(e) => e.stopPropagation()}>
                    <div className="pdm-likeusers-header">
                      <b>좋아요</b>
                      <button onClick={() => setLikeListOpen(false)}>✕</button>
                    </div>

                    {likersLoading ? (
                      <div className="pdm-likeusers-loading">불러오는 중...</div>
                    ) : (
                      <div className="pdm-likeusers-list">
                        {likers.map((u) => (
                          <div key={u.userId} className="pdm-likeuser-row">
                            <img className="pdm-likeuser-avatar" src={toUrl(u.profileImageUrl || "")} alt="" />
                            <div className="pdm-likeuser-meta">
                              <div className="pdm-likeuser-nick clickable" onClick={() => goProfile(u.userId)}>
                                {u.nickname}
                              </div>
                              {u.loginId && <div className="pdm-likeuser-id">{u.loginId}</div>}
                            </div>
                            <button className={"pdm-follow-btn " + (u.isFollowing ? "following" : "")} onClick={() => handleToggleFollow(u.userId)}>
                              {u.isFollowing ? "팔로잉" : "팔로우"}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 댓글 메뉴 모달 */}
              {menuTarget && (
                <div className="pdm-menu-backdrop" onClick={() => setMenuTarget(null)}>
                  <div className="pdm-menu" onClick={(e) => e.stopPropagation()}>
                    <button className="pdm-menu-item danger" onClick={handleDeleteComment}>
                      삭제
                    </button>
                    <button className="pdm-menu-item" onClick={() => setMenuTarget(null)}>
                      취소
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostDetailModal;
