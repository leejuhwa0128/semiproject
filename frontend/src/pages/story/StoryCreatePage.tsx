import React, { useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import "./StoryCreatePage.css";

const getMyUserId = () => {
  const v = localStorage.getItem("userId");
  const id = v ? Number(v) : NaN;
  return Number.isFinite(id) ? id : null;
};

const StoryCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  // ✅ 감정 파라미터
  const emotionParam = params.get("emotion");
  const emotion = emotionParam ? Number(emotionParam) : null;
  const emotionLabel = Number.isFinite(emotion)
    ? `${emotion} 감정 스토리 작성`
    : "새로운 스토리";

  const fileRef = useRef<HTMLInputElement | null>(null);

  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);

  const myId = getMyUserId();

  /* ---------------- 파일 처리 ---------------- */

  const pickFiles = () => fileRef.current?.click();

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const incoming = Array.from(list).filter((f) =>
      f.type.startsWith("image/")
    );
    setFiles((prev) => [...prev, ...incoming].slice(0, 10));
  };

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const canPost =
    (content.trim().length > 0 || files.length > 0) && !loading;

  /* ---------------- 이미지 업로드 ---------------- */

  const uploadMedia = async (): Promise<string[]> => {
    if (files.length === 0) return [];

    const form = new FormData();
    files.forEach((f) => form.append("files", f));

    // ✅ baseURL에 /api 포함 → /stories/media/upload 만 사용
   const res = await api.post<{ urls: string[] }>(
  "/api/stories/media/upload",
  form,
  {
    headers: { "Content-Type": "multipart/form-data" },
  }
);

    return res.data?.urls ?? [];
  };

  /* ---------------- 스토리 등록 ---------------- */

  const submit = async () => {
    if (!canPost) return;

    if (!myId) {
      alert("로그인이 필요합니다.");
      return;
    }

    try {
      setLoading(true);

      const mediaUrls = await uploadMedia();

      // ✅ /stories 로 호출 (중요)

      console.log("🔥 SUBMIT URL = /api/stories");
    await api.post("/api/stories", {
  userId: myId,
  content: content.trim() || null,
  mediaUrls,
  emotionScore: Number.isFinite(emotion) ? emotion : null,
});

      // 완료 후 내 프로필로 이동
      navigate(`/profile/${myId}`);
    } catch (e) {
      console.error("스토리 작성 실패:", e);
      alert("스토리 작성 실패");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- UI ---------------- */

  return (
    <div className="story-create">
      <div className="story-create-top">
        <button
          className="sc-btn"
          onClick={() => navigate(-1)}
          disabled={loading}
        >
          취소
        </button>

        <div className="sc-title">{emotionLabel}</div>

        <button
          className="sc-btn primary"
          onClick={submit}
          disabled={!canPost}
        >
          {loading ? "게시 중..." : "게시"}
        </button>
      </div>

      <div className="story-create-body">
        <textarea
          className="sc-textarea"
          placeholder="무슨 소식이 있나요?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={loading}
        />

        <div className="sc-toolbar">
          <button
            className="sc-image-btn"
            onClick={pickFiles}
            disabled={loading}
          >
            🖼️ 이미지 추가
          </button>
          <span className="sc-hint">최대 10장</span>
        </div>

        {files.length > 0 && (
          <div className="sc-grid">
            {files.map((f, idx) => (
              <div key={f.name + idx} className="sc-item">
                <img
                  className="sc-img"
                  src={URL.createObjectURL(f)}
                  alt=""
                />
                <button
                  className="sc-remove"
                  onClick={() => removeFile(idx)}
                  disabled={loading}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>
    </div>
  );
};

export default StoryCreatePage;
