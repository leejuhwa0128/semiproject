import React, { useEffect, useMemo, useState } from "react";
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

// ✅ 날짜만 표시(YYYY-MM-DD 형태)
const formatDateOnly = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
};

const PostDetailModal: React.FC<Props> = ({ postId, onClose }) => {
    const [data, setData] = useState<PostDetailResponse | null>(null);
    const [loading, setLoading] = useState(true);

    const [idx, setIdx] = useState(0);

    // ✅ 좋아요 로컬 상태(버튼 즉시 반응)
    const [likeCount, setLikeCount] = useState(0);
    const [isLiked, setIsLiked] = useState(false);
    const [likeLoading, setLikeLoading] = useState(false);

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
            } catch (e) {
                console.error("게시글 상세 불러오기 실패:", e);
                if (!mounted) return;
                setData(null);
            } finally {
                if (mounted) setLoading(false);
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
                                    <img
                                        className="pdm-image"
                                        src={toUrl(media[idx].mediaUrl)}
                                        alt={`media-${media[idx].mediaId}`}
                                    />
                                ) : (
                                    <div className="pdm-empty">이미지가 없습니다.</div>
                                )}

                                {media.length > 1 && (
                                    <>
                                        <button
                                            className="pdm-nav pdm-prev"
                                            onClick={() => hasPrev && setIdx((p) => p - 1)}
                                            disabled={!hasPrev}
                                        >
                                            ‹
                                        </button>
                                        <button
                                            className="pdm-nav pdm-next"
                                            onClick={() => hasNext && setIdx((p) => p + 1)}
                                            disabled={!hasNext}
                                        >
                                            ›
                                        </button>

                                        <div className="pdm-dots">
                                            {media.map((m, i) => (
                                                <button
                                                    key={m.mediaId}
                                                    className={"pdm-dot " + (i === idx ? "active" : "")}
                                                    onClick={() => setIdx(i)}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* 오른쪽 내용 */}
                        <div className="pdm-right">
                            {/* 유저 정보 */}
                            <div className="pdm-user">
                                <div className="pdm-avatar">
                                    {data.profileImageUrl ? (
                                        <img src={toUrl(data.profileImageUrl)} alt="프로필" />
                                    ) : (
                                        <div className="pdm-avatar-placeholder">?</div>
                                    )}
                                </div>

                                <div className="pdm-user-meta">
                                    <div className="pdm-nickname">{data.nickname}</div>

                                    {/* ✅ 닉네임 바로 아래 날짜 */}
                                    <div className="pdm-date-only">
                                        {formatDateOnly(data.createdAt)}
                                    </div>
                                </div>
                            </div>

                            {/* ✅ 날짜 바로 아래 content */}
                            <div className="pdm-content">
                                {data.content?.trim()?.length ? data.content : "내용이 없습니다."}
                            </div>

                            {/* ✅ 맨 아래 좋아요 */}
                            <div className="pdm-actions">
                                <button
                                    className={"pdm-like-btn " + (isLiked ? "liked" : "")}
                                    onClick={handleToggleLike}
                                    disabled={likeLoading}
                                >
                                    {isLiked ? "♥" : "♡"}
                                </button>

                                <div className="pdm-like-count">좋아요 {likeCount}개</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PostDetailModal;
