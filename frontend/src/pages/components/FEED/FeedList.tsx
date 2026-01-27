import { useEffect, useState } from "react";
import { fetchRecommendedPosts } from "../../../api/posts";
import FeedItem from "./FeedItem";
import PostDetailModal from "../../../components/PostDetailModal";
import "./Feed.css";

const emotionEmojis = [
  "😞", "😔", "😐", "😌", "🙂",
  "😊", "😄", "😆", "🤩", "🥰"
];

export default function FeedList() {
  /** 원본 피드 */
  const [feed, setFeed] = useState<any[]>([]);
  /** 정렬된 피드 */
  const [sortedFeed, setSortedFeed] = useState<any[]>([]);
  /** 기준 감정 */
  const [baseEmotion, setBaseEmotion] = useState<number | null>(null);

  /** 댓글 모달 */
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
     점수 계산 + 프론트 정렬
     (baseEmotion 기준)
  ========================= */
  useEffect(() => {
    if (!feed.length || baseEmotion === null) return;

    const sorted = [...feed]
      .map((f) => {
        const emotion = f.emotion ?? f.EMOTION ?? 0;

        // ✅ 기준 감정과의 거리 기반 점수
        const score = 10 - Math.abs(emotion - baseEmotion);

        return {
          ...f,
          _score: Number(score.toFixed(2)), // 내부 정렬용 점수
        };
      })
      .sort((a, b) => {
        // 1️⃣ 점수 우선
        if (b._score !== a._score) {
          return b._score - a._score;
        }

        // 2️⃣ 점수 같으면 STORY 먼저
        const aTypePriority = (a.type ?? a.TYPE) === "STORY" ? 0 : 1;
        const bTypePriority = (b.type ?? b.TYPE) === "STORY" ? 0 : 1;

        return aTypePriority - bTypePriority;
      });

    // 🔥 콘솔 디버깅
    console.log("==== 피드 점수 계산 & 정렬 ====");
    sorted.forEach((f) => {
      console.log(
        `ID: ${f.id ?? f.ID}, Type: ${f.type ?? f.TYPE}, Emotion: ${f.emotion ?? f.EMOTION
        }, Score: ${f._score}`
      );
    });
    console.log("==============================");

    setSortedFeed(sorted);
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
        {/* ✅ 기준 감정 표시 */}
        {baseEmotion !== null && (
          <div className="feed-base-emotion">
            <span className="emoji">
              {emotionEmojis[Math.round(baseEmotion) - 1]}
            </span>
            <span className="text">
              현재 추천 기준 감정 ({baseEmotion.toFixed(1)})
            </span>
          </div>
        )}

        {sortedFeed.length === 0 && (
          <div>표시할 피드가 없습니다.</div>
        )}

        {sortedFeed.map((item, index) => (
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
