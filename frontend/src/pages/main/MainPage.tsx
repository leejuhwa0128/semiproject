import { useNavigate } from "react-router-dom";
import { useRef } from "react";
import FeedList from "../components/FEED/FeedList";
import "./MainPage.css";

const emotionEmojis = [
  "😞","😔","😐","😌","🙂",
  "😊","😄","😆","🤩","🥰"
];

const ITEM_WIDTH = 96;   // 링 포함 1개 너비
const VISIBLE_COUNT = 5;

const MainPage = () => {
  const navigate = useNavigate();
  const barRef = useRef<HTMLDivElement | null>(null);

  // ⬅️➡️ 마우스 휠로 5개씩 좌우 이동
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();

    barRef.current?.scrollBy({
      left:
        e.deltaY > 0
          ? ITEM_WIDTH * VISIBLE_COUNT
          : -ITEM_WIDTH * VISIBLE_COUNT,
      behavior: "smooth",
    });
  };

  const goStoryCreate = (emotion: number) => {
    navigate(`/story/create?emotion=${emotion}`);
  };

  return (
    <div className="main-page">
      {/* 🔥 감정 스토리 (인스타 스타일) */}
      <div className="emotion-story-wrapper">
        <div
          className="emotion-story-bar"
          ref={barRef}
          onWheel={handleWheel}
        >
          {emotionEmojis.map((emoji, idx) => (
            <button
              key={idx}
              className="emotion-story-item"
              onClick={() => goStoryCreate(idx + 1)}
            >
              {/* ✅ 인스타 스토리 링 */}
              <div className="emotion-ring">
                <div className="emotion-circle">
                  {emoji}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 📰 추천 피드 */}
      <FeedList />
    </div>
  );
};

export default MainPage;
