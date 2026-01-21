import { useEffect, useState } from "react";
import { fetchRecommendedPosts } from "../../../api/posts";
import FeedItem from "./FeedItem";
import "./Feed.css";

export default function FeedList() {
  const [feed, setFeed] = useState<any[]>([]);

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

  return (
    <div className="feed-wrapper">
      {feed.length === 0 && <div>표시할 피드가 없습니다.</div>}

      {feed.map((item, index) => (
        <FeedItem key={`${item.TYPE}-${item.ID}-${index}`} item={item} />
      ))}
    </div>
  );
}
