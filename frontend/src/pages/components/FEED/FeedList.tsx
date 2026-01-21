import { useEffect, useState } from "react";
import { fetchRecommendedPosts } from "../../../api/posts";
import FeedItem from "./FeedItem";
import PostDetailModal from "../../../components/PostDetailModal";
import "./Feed.css";

export default function FeedList() {
  const [feed, setFeed] = useState<any[]>([]);

  // ✅ 댓글 모달용 상태
  const [openedPostId, setOpenedPostId] = useState<number | null>(null);

  /* =========================
     피드 불러오기
  ========================= */
  useEffect(() => {
    fetchRecommendedPosts()
      .then((data) => {
        setFeed(Array.isArray(data.feed) ? data.feed : []);
      })
      .catch((err) => {
        console.error("추천 피드 불러오기 실패", err);
        setFeed([]);
      });
  }, []);

  /* =========================
     댓글 모달 제어
  ========================= */
  const openDetail = (postId: number) => {
    setOpenedPostId(postId);
  };

  const closeDetail = () => {
    setOpenedPostId(null);
  };

  const handleDeletedPost = (postId: number) => {
    // ✅ 모달에서 게시글 삭제 시 피드에서도 제거
    setFeed((prev) => prev.filter((p) => p.id !== postId && p.ID !== postId));
    setOpenedPostId(null);
  };

  return (
    <>
      <div className="feed-wrapper">
        {feed.length === 0 && <div>표시할 피드가 없습니다.</div>}

        {feed.map((item, index) => (
          <FeedItem
            key={`${item.type ?? item.TYPE}-${item.id ?? item.ID}-${index}`}
            item={{
              // ✅ 서버에서 대문자로 오든 소문자로 오든 정규화
              type: item.type ?? item.TYPE,
              id: item.id ?? item.ID,
              content: item.content ?? item.CONTENT,
              emotion: item.emotion ?? item.EMOTION ?? 0,

              authorNickname:
                item.authorNickname ?? item.AUTHOR_NICKNAME ?? "",
              authorProfileUrl:
                item.authorProfileUrl ?? item.AUTHOR_PROFILE_URL ?? null,

              mediaUrls: item.mediaUrls ?? item.MEDIA_URLS ?? [],

              likeCount: item.likeCount ?? item.LIKE_COUNT ?? 0,
              isLiked: item.isLiked ?? item.IS_LIKED ?? false,
            }}
            onOpenDetail={openDetail} // ✅ 댓글 클릭 → 모달 열기
          />
        ))}
      </div>

      {/* =========================
          게시글 상세 모달
      ========================= */}
      {openedPostId !== null && (
        <PostDetailModal
          postId={openedPostId}
          onClose={closeDetail}
          onDeleted={handleDeletedPost}
        />
      )}
    </>
  );
}
