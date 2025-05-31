import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import MainLayout from "./layouts/MainLayout";
import Home from "./pages/Home";
import Projects from "./pages/Projects";
import Install from "./pages/Install";
import ProjectsView from "./pages/ProjectsView";
import Admin from "./pages/Admin";
import OwnUser from "./pages/OwnUser";
import { checkInstallation } from "./functions/checkInstallation";
import Login from "./pages/Login";
import config from "./config/config.json";
import AcceptInvite from "./pages/AcceptInvite";
import { Navigate } from "react-router-dom";
import UserProfile from "./pages/UserProfile";

const apiUrl = import.meta.env.VITE_APP_API_URL || "http://localhost:3001";

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [isInstalled, setIsInstalled] = useState(true);
  const [user, setUser] = useState(null);


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
        setLoading(false);
      }
    } catch (error) {
      console.error("Fehler beim Abrufen des Benutzers:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    const verifyInstallation = async () => {
      const isInstalled = await checkInstallation();
      setIsInstalled(isInstalled);

      if (!isInstalled) {
        navigate("/install");
        setLoading(false);
      }
      if (location.pathname !== "/login") {
        fetchUser()
      }
      else {
        fetchUser()

        setLoading(false);
      }
    };

    verifyInstallation();
  }, [navigate]);

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const response = await fetch(`${apiUrl}/verify-token`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `${token}`
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();
        if (data.status !== "success") {
          navigate("/login");
        }
      } catch (error) {
        navigate("/login");
      }
    };

    // Exkludiere /login, /install und /invite
    if (
      location.pathname !== "/login" &&
      location.pathname !== "/install" &&
      !location.pathname.startsWith("/invite")
    ) {
      verifyToken();
    }
    if (location.pathname.startsWith("/invite")) {
      setLoading(false);
      return;
    }
  }, [navigate, location.pathname]);

  if (loading) {
    return <div>Lade...</div>; // Optionale Ladeanzeige
  }

  return (
    <Routes>
      {/* Invite immer erreichbar */}
      <Route path="/invite/:token" element={<AcceptInvite />} />

      {/* Installationsseite OHNE Layout */}
      {!user && <Route path="/login" element={<Login />} />}
      {!isInstalled && <Route path="/install" element={<Install />} />}

      {/* Alle anderen Seiten MIT MainLayout */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Home />} />
        <Route path="projects" element={<Projects />} />
        <Route path="project/view/*" element={<ProjectsView />} />
        <Route path="ownUser" element={<OwnUser />} />
        <Route path="/user/:username" element={<UserProfile />} />
        {user?.isAdmin ? <Route path="admin" element={<Admin />} /> : null }
      </Route>
    </Routes>
  );
}

export default App;
