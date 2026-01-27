import { useEffect, useState } from "react";
import { fetchRecommendedPosts } from "../../../api/posts";
import FeedItem from "./FeedItem";
import PostDetailModal from "../../../components/PostDetailModal";
import "./Feed.css";

const emotionEmojis = [
  "😞","😔","😐","😌","🙂",
  "😊","😄","😆","🤩","🥰"
];

export default function FeedList() {
  const [feed, setFeed] = useState<any[]>([]);
  const [baseEmotion, setBaseEmotion] = useState<number | null>(null);

  // ✅ 댓글 모달용 상태
  const [openedPostId, setOpenedPostId] = useState<number | null>(null);

  /* =========================
     피드 불러오기
  ========================= */
  useEffect(() => {
    fetchRecommendedPosts()
      .then((data) => {
        setBaseEmotion(
          typeof data.baseEmotion === "number"
            ? data.baseEmotion
            : null
        );

        setFeed(Array.isArray(data.feed) ? data.feed : []);
      })
      .catch((err) => {
        console.error("추천 피드 불러오기 실패", err);
        setFeed([]);
      });
  }, []);

  /* =========================
     점수 계산 및 콘솔 출력
     (baseEmotion 기준)
  ========================= */
  useEffect(() => {
    if (!feed || baseEmotion === null) return;

    // score 계산: 단순 절댓값 차이 기준
    const feedsWithScore = feed.map(f => {
      const score = 10 - Math.abs((f.emotion ?? 0) - baseEmotion);
      return { ...f, score };
    }).sort((a, b) => b.score - a.score); // score 높은 순

    // 콘솔 출력
    console.log("==== 피드 점수 계산 ====");
    feedsWithScore.forEach(f => {
      console.log(
        `ID: ${f.id ?? f.ID}, Type: ${f.type ?? f.TYPE}, Emotion: ${f.emotion ?? f.EMOTION}, Score: ${f.score}`
      );
    });
    console.log("=======================");
  }, [feed, baseEmotion]);

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
    setFeed((prev) =>
      prev.filter((p) => p.id !== postId && p.ID !== postId)
    );
    setOpenedPostId(null);
  };

  return (
    <>
      <div className="feed-wrapper">
        {/* ✅ 기준 감정 표시 (맨 위) */}
        {baseEmotion && (
          <div className="feed-base-emotion">
            <span className="emoji">
              {emotionEmojis[baseEmotion - 1]}
            </span>
            <span className="text">
              현재 추천 기준 감정
            </span>
          </div>
        )}

        {feed.length === 0 && <div>표시할 피드가 없습니다.</div>}

        {feed.map((item, index) => (
          <FeedItem
            key={`${item.type ?? item.TYPE}-${item.id ?? item.ID}-${index}`}
            item={{
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
            onOpenDetail={openDetail}
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
