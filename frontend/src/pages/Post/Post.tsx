import { useState } from "react";
import axios from "axios";
import "./Post.css";

const Post = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [content, setContent] = useState("");
  const [emotion, setEmotion] = useState<number>(5);

  

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const files = Array.from(e.target.files);
    setSelectedFiles(files);

    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviewUrls(urls);
  };

  const handleUpload = async () => {
    try {
      if (!content.trim()) {
        alert("내용을 입력하세요");
        return;
      }

      let mediaUrls: {
        url: string;
        type: string;
      }[] = [];

      // 1️⃣ 이미지 업로드 먼저
      if (selectedFiles.length > 0) {
        const formData = new FormData();
        selectedFiles.forEach((file) => formData.append("media", file));

        const mediaRes = await axios.post(
          "http://localhost:4000/api/media/upload",
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        );

        mediaUrls = mediaRes.data.urls;
        console.log("📸 업로드 결과:", mediaUrls);
      }

      // 2️⃣ 게시글 + 이미지 DB 저장
      await axios.post("http://localhost:4000/api/posts", {
  userId: 1,
  content,
  emotion,     
  mediaUrls,
});


      alert("게시글 등록 성공!");
      setContent("");
      setSelectedFiles([]);
      setPreviewUrls([]);
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
              <label className="file-select">
                <span>사진을 선택하세요</span>
                <input type="file" multiple onChange={handleFileChange} />
              </label>
            ) : (
              <div className="preview-images">
                {previewUrls.map((src, idx) => (
                  <img key={idx} src={src} alt="preview" />
                ))}
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
