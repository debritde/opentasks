import { useState, useEffect } from "react";
import { Link, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { themeChange } from "theme-change";
import Search from "../components/Search";
import "../i18n";
import "../styles/layout_dark.css";
import config from "../config/config.json";

const apiUrl = import.meta.env.VITE_APP_API_URL || "http://localhost:3001";

const NavBar = () => {
  const { t, i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(localStorage.getItem("language") || i18n.language);
  const [theme, setTheme] = useState("dark");
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState(null);
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);

  useEffect(() => {
    themeChange(false);
    fetchUser();
    i18n.changeLanguage(currentLanguage);
  }, []);

  const fetchUser = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch(`${apiUrl}/users/byLoginToken`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token
        },
        body: JSON.stringify({ loginToken: token }),
      });
      
      const data = await response.json();
      if (data.status === "success") {
        setUser(data.user);
      }
    } catch (error) {
      console.error("Fehler beim Abrufen des Benutzers:", error);
    }
  };

  const changeLanguage = (event) => {
    const newLang = event.target.value;
    i18n.changeLanguage(newLang);
    setCurrentLanguage(newLang);
    localStorage.setItem("language", newLang);
  };

  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.reload();
  };

  const toggleNav = () => setIsNavCollapsed(!isNavCollapsed);

  return (
    <div id="mainLayout">
      <div
        id="nav-bar"
        className={isNavCollapsed ? "collapsed" : ""}
      >
        <div id="nav-header">
          <div style={{display: "flex", alignItems: "center", gap: "10px"}}>
            <img src="/logo.png" height="40px" />
            {!isNavCollapsed && <h1>{t("OpenTasks")}</h1>}
          </div>
        </div>
        <div id="nav-body">
          <Link onClick={() => setSearchQuery("")} id="nav-item" to="/">
            <span role="img" aria-label="Home">🏠 </span>
            {!isNavCollapsed && t("home")}
          </Link>
          <Link onClick={() => setSearchQuery("")} id="nav-item" to="/projects">
            <span role="img" aria-label="Projects">📁 </span>
            {!isNavCollapsed && t("projects")}
          </Link>
          {user?.isAdmin && (
            <Link onClick={() => setSearchQuery("")} id="nav-item" to="/admin">
              <span role="img" aria-label="Admin">🛠️ </span>
              {!isNavCollapsed && t("Admin")}
            </Link>
          )}
        </div>
        <div id="nav-footer">
          <select
            id="language-selector"
            onChange={changeLanguage}
            value={currentLanguage}
            className={isNavCollapsed ? "collapsed" : ""}
            title={currentLanguage === "en" ? "English" : "Deutsch"}
          >
            <option value="en">🇬🇧{!isNavCollapsed && " English"}</option>
            <option value="de">🇩🇪{!isNavCollapsed && " Deutsch"}</option>
          </select>
          <button
            data-set-theme={theme === "dark" ? "light" : "dark"}
            onClick={toggleTheme}
            className={`theme-toggle ${isNavCollapsed ? "collapsed" : ""}`}
            title={theme === "dark" ? t("light_mode") : t("dark_mode")}
          >
            {theme === "dark" ? "☀️" : "🌙"}
            {!isNavCollapsed && (theme === "dark" ? " " + t("light_mode") : " " + t("dark_mode"))}
          </button>
          <button
            id="nav-item"
            onClick={handleLogout}
            className={`logout-button${isNavCollapsed ? " collapsed" : ""}`}
            title={t("logout")}
          >
            <span role="img" aria-label="Logout">🚪</span>
            {!isNavCollapsed && t("logout")}
          </button>
          <div
            id="nav-item"
            onClick={toggleNav}
            title={isNavCollapsed ? t("expand") : t("collapse")}
          >
            {isNavCollapsed ? "➡️" : "⬅️"}
          </div>
        </div>
      </div>
      <div id="content-wrapper">
        <div id="top-bar">
          <input
            type="text"
            placeholder={t("search")}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ marginRight: "16px", padding: "6px 10px", borderRadius: "6px", border: "1px solid #444", background: "var(--navbar-bg)", color: "var(--navbar-text)" }}
          />
          <Link to={`/ownUser`}>{user && <span className="user-info">👤 {user.username}</span>}</Link>
        </div>
        <div id="content">
          {searchQuery !== "" ? <Search query={searchQuery} /> : <Outlet />}
        </div>
      </div>
    </div>
  );
};

export default NavBar;
