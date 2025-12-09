import { useEffect, useState } from "react";
import axios from "axios";

function MainPage() {
  const [message, setMessage] = useState("불러오는 중...");

  useEffect(() => {
    axios
      .get("http://localhost:4000/api/main")
      .then((res) => setMessage(res.data.message))
      .catch(() => setMessage("에러 발생"));
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>{message}</h1>
    </div>
  );
}

export default MainPage;
