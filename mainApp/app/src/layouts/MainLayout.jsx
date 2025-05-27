import { useState, useEffect } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { themeChange } from "theme-change";
import Search from "../components/Search";
import TaskViewModal from "../components/TaskViewModal";
import "../i18n";
import "../styles/layout_dark.css";

const apiUrl = import.meta.env.VITE_APP_API_URL || "http://localhost:3001";

const NavBar = () => {
  const { t, i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(localStorage.getItem("language") || i18n.language);
  const [theme, setTheme] = useState("dark");
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState(null);
  const [isNavCollapsed, setIsNavCollapsed] = useState(false);
  const [globalTimers, setGlobalTimers] = useState([]);
  const [openTaskId, setOpenTaskId] = useState(null);
  const [openTaskData, setOpenTaskData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    themeChange(false);
    fetchUser();
    i18n.changeLanguage(currentLanguage);
  }, []);

  useEffect(() => {
    // Prüfe alle 1s, ob ein Timer läuft (aus localStorage)
    const interval = setInterval(() => {
      const trackingTimes = JSON.parse(localStorage.getItem("trackingTimes") || "{}");
      const timers = Object.keys(trackingTimes).map(taskId => {
        const tracking = trackingTimes[taskId];
        const start = new Date(tracking.start);
        const taskTitle = tracking.title;
        const now = new Date();
        const diff = Math.floor((now - start) / 1000);
        const hours = String(Math.floor(diff / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
        const seconds = String(diff % 60).padStart(2, '0');
        return { taskId, elapsed: `${hours}:${minutes}:${seconds}`, taskTitle };
      });
      setGlobalTimers(timers);
    }, 1000);
    return () => clearInterval(interval);
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

  const openTaskModal = async (taskId) => {
    try {
      const res = await fetch(`${apiUrl}/tasks/${taskId}`, {
        headers: { "Authorization": localStorage.getItem("token") }
      });
      const data = await res.json();
      if (data.status === "success") {
        setOpenTaskData(data.task);
        setOpenTaskId(taskId);
      }
    } catch (err) {
      alert("Fehler beim Laden des Tasks.");
    }
  };

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
          {globalTimers.length > 0 && (
            <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 6 }}>
              {globalTimers.map(timer => (
                <div
                  key={timer.taskId}
                  style={{
                    marginLeft: isNavCollapsed ? 0 : 2,
                    padding: isNavCollapsed ? "4px 8px" : "6px 12px",
                    fontSize: isNavCollapsed ? "10px" : "12px",
                    minWidth: isNavCollapsed ? "unset" : 160,
                    margin: isNavCollapsed ? "0px" : "0px",

                    cursor: "pointer"
                  }}
                  className="timer-badge"
                  title={timer.taskTitle ? timer.taskTitle : ""}
                  onClick={() => openTaskModal(timer.taskId)}
                >
                  ⏱️ {timer.elapsed}
                  {!isNavCollapsed && timer.taskTitle && (
                    <span style={{ marginLeft: 8, fontWeight: 500 }}>
                      {timer.taskTitle}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
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
      {openTaskData && (
        <TaskViewModal
          task={openTaskData}
          onClose={() => {
            setOpenTaskId(null);
            setOpenTaskData(null);
          }}
        />
      )}
    </div>
  );
};

export default NavBar;
