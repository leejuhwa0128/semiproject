import { useNavigate } from "react-router-dom";
import { useRef } from "react";
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
    console.log("CLICK EMOTION:", emotion);
    alert(`emotion ${emotion} clicked`);
    navigate(`/story/create?emotion=${emotion}`);
  };

  return (
    <div className="main-page">
      <div className="emotion-story-wrapper">
        <button
          className="story-nav left"
          onClick={scrollLeft}
          type="button"
          aria-label="left"
        >
          ‹
        </button>

        <div className="emotion-story-bar" ref={barRef}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <button
              key={n}
              type="button"
              className="emotion-story-item"
              onClick={() => goStoryCreate(n)}
              aria-label={`emotion-${n}`}
            >
              <div className="emotion-circle">{n}</div>
            </button>
          ))}
        </div>

        <button
          className="story-nav right"
          onClick={scrollRight}
          type="button"
          aria-label="right"
        >
          ›
        </button>
      </div>
    </div>
  );
};

export default MainPage;
