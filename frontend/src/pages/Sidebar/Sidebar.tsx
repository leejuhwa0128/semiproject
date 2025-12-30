import React from "react";
import { Link } from "react-router-dom";
import "./Sidebar.css";

const getMyUserId = () => {
    const v = localStorage.getItem("userId");
    const id = v ? Number(v) : NaN;
    return Number.isFinite(id) ? id : null;
};


const Sidebar: React.FC = () => {
    const myId = getMyUserId();
    return (
        <div className="sidebar">
            <ul className="menu">
                <li>
                    <a href="/main">🏠 홈</a>
                </li>

                <li>
                    <a href="/search">🔍 검색</a>
                </li>

                <li>
                    <a href="/explore">🧭 탐색 탭</a>
                </li>

                <li>
                    <a href="/Post">➕ 만들기</a>
                </li>

                <li><Link to={myId ? `/profile/${myId}` : "/profile"}>👤 프로필</Link></li>
            </ul>

            <div className="logout-section">
                <a href="/logout">🚪 로그아웃</a>
            </div>
        </div>
    );
};

export default Sidebar;
