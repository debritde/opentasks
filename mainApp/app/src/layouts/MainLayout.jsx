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

  return (
    <div id="mainLayout">
      <div id="nav-bar">
        <div id="nav-header">
          <img src="/logo.png" height="50px"/>
          <h1>{t("openTasks")}</h1>
        </div>
        <div id="nav-body">
          <Link onClick={() => setSearchQuery("")} id="nav-item" to="/">{t("home")}</Link>
          <Link onClick={() => setSearchQuery("")} id="nav-item" to="/projects">{t("projects")}</Link>
          {user?.isAdmin ? <Link onClick={() => setSearchQuery("")} id="nav-item" to="/admin">{t("Admin")}</Link> : null }
        </div>
        <div id="nav-footer">
          <select id="language-selector" onChange={changeLanguage} value={currentLanguage}>
            <option value="en">🇬🇧 English</option>
            <option value="de">🇩🇪 Deutsch</option>
          </select>
          <button 
            data-set-theme={theme === "dark" ? "light" : "dark"} 
            onClick={toggleTheme} 
            className="theme-toggle"
          >
            {theme === "dark" ? "☀️ " + t("light_mode") : "🌙 " + t("dark_mode")}
          </button>
          <button id="nav-item" onClick={handleLogout} className="logout-button">
            {t("logout")}
          </button>
        </div>
      </div>

      <div id="content-wrapper">
        <div id="top-bar">
          <input type="hidden" value="noautocompletion" />
          <input onChange={(e) => setSearchQuery(e.target.value)} placeholder={t("search_placeholder")} autoComplete="off" name="search"/>
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
