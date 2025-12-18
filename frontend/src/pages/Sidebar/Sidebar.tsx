import React from "react";
import { Link } from "react-router-dom";
import "./Sidebar.css";


const Sidebar: React.FC = () => {
    return (
        <div className="sidebar">
            <ul className="menu">
                <li>
                    <Link to="/main">🏠 홈</Link>
                </li>

                <li>
                    <Link to="/search">🔍 검색</Link>
                </li>

                <li>
                    <Link to="/explore">🧭 탐색 탭</Link>
                </li>

                <li>
                    <Link to="/Post">➕ 만들기</Link>
                </li>

                <li>
                    <Link to="/profile">👤 프로필</Link>
                </li>
            </ul>

            <div className="logout-section">
                <Link to="/logout">🚪 로그아웃</Link>
            </div>
        </div>
    );
};

export default Sidebar;
