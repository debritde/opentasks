import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const apiUrl = import.meta.env.VITE_APP_API_URL || "http://localhost:3001";

// Hilfsfunktion für Initialen
function getInitials(user) {
  if (!user) return "";
  const first = user.firstname?.[0] || "";
  const last = user.lastname?.[0] || "";
  return (first + last).toUpperCase();
}

export default function UserProfile() {
  const { username } = useParams();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch(`${apiUrl}/users/by-username/${username}`, {
          headers: { Authorization: localStorage.getItem("token") }
        });
        const data = await res.json();
        if (data.status === "success") setUser(data.user);
        else setError(data.message || "User not found");
      } catch (e) {
        setError("Fehler beim Laden des Benutzers");
      }
    };
    fetchUser();
  }, [username]);

  if (error) return <div className="error-message">{error}</div>;
  if (!user) return <div>{t("loading") || "Lädt..."}</div>;

  return (
    <div className="user-profile-container">
      <div className="user-profile-card">
        <div className="user-profile-header">
          <div className="user-profile-image" style={{
            background: "var(--blue-light)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2.5rem",
            fontWeight: "bold",
            width: 100,
            height: 100,
            borderRadius: "50%",
            margin: "0 auto 10px auto",
            userSelect: "none"
          }}>
            {getInitials(user)}
          </div>
          <div className="user-profile-username">
            @{user.username}
          </div>
          <h2 style={{ margin: "10px 0 0 0" }}>
            {user.firstname} {user.lastname}
          </h2>
        </div>
        <div className="user-profile-details">
          <p><strong>{t("email") || "E-Mail"}:</strong> {user.email}</p>
          {user.phoneNumber && (
            <p><strong>{t("phone_number") || "Telefon"}:</strong> {user.phoneNumber}</p>
          )}
          {user.role && (
            <p><strong>{t("role") || "Rolle"}:</strong> {user.role}</p>
          )}
          {user.isAdmin && (
            <p><span className="user-badge" style={{ background: "crimson", color: "#fff" }}>{t("admin") || "Admin"}</span></p>
          )}
          {user.invited && (
            <p><span className="user-badge" style={{ background: "#ffc107", color: "#333" }}>{t("invited") || "Eingeladen"}</span></p>
          )}
        </div>
      </div>
    </div>
  );
}