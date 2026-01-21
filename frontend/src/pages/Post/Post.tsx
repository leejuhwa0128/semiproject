import { useEffect, useState } from "react";
import api from "../../api/axios";
import "./Post.css";
import { useNavigate } from "react-router-dom";

const Post = () => {
  const navigate = useNavigate();

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [content, setContent] = useState("");
  const [emotion, setEmotion] = useState<number>(5);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const files = Array.from(e.target.files);
    setSelectedFiles(files);

    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);
    setCurrentIndex(0);
  };

  // objectURL 메모리 정리
  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  const handleUpload = async () => {
    try {
      if (!content.trim()) {
        alert("내용을 입력하세요");
        return;
      }

      let mediaUrls: { url: string; type: string }[] = [];

      // 1️⃣ 이미지 업로드
      if (selectedFiles.length > 0) {
        const formData = new FormData();
        selectedFiles.forEach((file) => formData.append("media", file));

        const mediaRes = await api.post("/api/media/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        mediaUrls = mediaRes.data.urls;
      }

      // 2️⃣ 게시글 저장 (🔥 userId 하드코딩 제거)
      await api.post("/api/posts", {
        content,
        emotion,
        mediaUrls,
      });

      alert("게시글 등록 성공!");
      navigate("/main");

      // 초기화
      setContent("");
      setSelectedFiles([]);
      setPreviewUrls([]);
      setCurrentIndex(0);
    } catch (err) {
      console.error("❌ 게시글 등록 실패:", err);
      alert("게시글 등록 실패");
    }
  };

  return (
    <div className="post-container">
      <div className="post-card">
        <div className="post-header">새 게시물 만들기</div>

        <div className="post-content-area">
          <div className="post-preview-box">
            {previewUrls.length === 0 ? (
              <>
                <label className="file-select" htmlFor="mediaInput">
                  <span>사진을 선택하세요</span>
                </label>
                <input
                  id="mediaInput"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
              </>
            ) : (
              <div className="carousel">
                <img
                  className="carousel-image"
                  src={previewUrls[currentIndex]}
                  alt={`preview-${currentIndex}`}
                />

                {previewUrls.length > 1 && (
                  <>
                    <button
                      type="button"
                      className="carousel-btn left"
                      onClick={() =>
                        setCurrentIndex((prev) =>
                          prev === 0 ? previewUrls.length - 1 : prev - 1
                        )
                      }
                    >
                      &lt;
                    </button>

                    <button
                      type="button"
                      className="carousel-btn right"
                      onClick={() =>
                        setCurrentIndex((prev) =>
                          prev === previewUrls.length - 1 ? 0 : prev + 1
                        )
                      }
                    >
                      &gt;
                    </button>

                    <div className="carousel-indicator">
                      {currentIndex + 1} / {previewUrls.length}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="post-write-box">
            <div className="emotion-select">
              <label>지금 기분</label>
              <input
                type="range"
                min={0}
                max={10}
                value={emotion}
                onChange={(e) => setEmotion(Number(e.target.value))}
              />
              <span>{emotion}</span>
            </div>

            <textarea
              placeholder="문구 입력..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
        </div>

        <button type="button" className="post-upload-btn" onClick={handleUpload}>
          업로드
        </button>
      </div>
    </div>
  );
};

export default Post;
