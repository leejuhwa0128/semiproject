import { useNavigate } from "react-router-dom";
import { useRef } from "react";
import FeedList from "../components/FEED/FeedList";
import "./MainPage.css";

const MainPage = () => {
  const navigate = useNavigate();
  const barRef = useRef<HTMLDivElement | null>(null);

  const scrollLeft = () => {
    barRef.current?.scrollBy({ left: -220, behavior: "smooth" });
  };

  const scrollRight = () => {
    barRef.current?.scrollBy({ left: 220, behavior: "smooth" });
  };

  const goStoryCreate = (emotion: number) => {
    navigate(`/story/create?emotion=${emotion}`);
  };

  return (
    <div className="main-page">
      {/* 🔥 감정 스토리 바 */}
      <div className="emotion-story-wrapper">
        <button className="story-nav left" onClick={scrollLeft}>‹</button>

        <div className="emotion-story-bar" ref={barRef}>
          {[1,2,3,4,5,6,7,8,9,10].map((n) => (
            <button
              key={n}
              className="emotion-story-item"
              onClick={() => goStoryCreate(n)}
            >
              <div className="emotion-circle">{n}</div>
            </button>
          ))}
        </div>

        <button className="story-nav right" onClick={scrollRight}>›</button>
      </div>

      {/* 📰 추천 피드 */}
      <FeedList />
    </div>
  );
};

export default MainPage;
