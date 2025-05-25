import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import config from "../config/config.json";
import "../i18n";

const apiUrl = import.meta.env.VITE_APP_API_URL || "http://localhost:3001";


// ✅ Funktion zum Hashen des Passworts mit SHA-512
const hashPassword = async (password) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-512", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(byte => byte.toString(16).padStart(2, "0")).join("");
};

const AdminUserManagement = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newUser, setNewUser] = useState({
    firstname: "",
    lastname: "",
    username: "",
    email: "",
    phoneNumber: "",
    password: "",
    language: "en",
    isAdmin: false,
  });
  const [editUser, setEditUser] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteMsg, setInviteMsg] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const response = await fetch(`${apiUrl}/users`, {
          method: "GET",
          headers: { "Authorization": `${token}` },
        });
        const data = await response.json();
        console.log(data);
        if (data.status === "success") setUsers(data.users);
      } catch (error) {
        console.error(t("error_loading_users"), error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [t]);


  // ✅ Neues Passwort vor dem Speichern hashen
  const handleAddUser = async () => {
    if (!newUser.username || !newUser.password) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const hashedPassword = await hashPassword(newUser.password);
console.log(hashedPassword)
      const response = await fetch(`${apiUrl}/user/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `${token}`,
        },
        body: JSON.stringify({ ...newUser, password: hashedPassword }), // ⬅️ Gehashtes Passwort senden
      });

      const data = await response.json();
      if (data.status === "success") setUsers([...users, data.user]);
    } catch (error) {
      console.error(t("error_creating_user"), error);
    }
  };

  // ✅ Passwort hashen, bevor es an die API gesendet wird
  const handleUpdateUser = async () => {
    if (!editUser) return;

    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      let updatedUserData = { ...editUser };

      if (editUser.password) {
        updatedUserData.password = await hashPassword(editUser.password); // ⬅️ Neues Passwort hashen
      }

      const response = await fetch(`${apiUrl}/user/update/${editUser._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `${token}`,
        },
        body: JSON.stringify(updatedUserData),
      });

      const data = await response.json();
      if (data.status === "success") {
        setUsers(users.map(user => (user._id === editUser._id ? data.user : user)));
        setEditUser(null);
      }
    } catch (error) {
      console.error(t("error_updating_user"), error);
    }
  };

  const handleDeleteUser = async (id) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch(`${apiUrl}/user/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `${token}`,
        },
        body: JSON.stringify({ id }),
      });
      const data = await response.json();
      if (data.status === "success") setUsers(users.filter(user => user._id !== id));
    } catch (error) {
      console.error(t("error_deleting_user"), error);
    }
  };

  const isValidEmail = (email) => {
    // Einfache E-Mail-Validierung (RFC-konform ist komplexer, das reicht für UI)
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleInvite = async () => {
    if (!isValidEmail(inviteEmail)) {
      setInviteMsg(t("invite_user_error_invalid_email") || "Bitte eine gültige E-Mail-Adresse eingeben.");
      return;
    }
    const token = localStorage.getItem("token");
    if (!token) return;

    const res = await fetch(`${apiUrl}/users/invite`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": token },
      body: JSON.stringify({ email: inviteEmail, username: inviteUsername })
    });
    const data = await res.json();
    setInviteMsg(data.message);
  };

  if (loading) return <div>{t("loading_users")}</div>;

  return (
    <div>
      <h1>{t("user_management")}</h1>
      <div className="status-option-container">
        <div className="user-management-card">
          <span>{t("username")}</span>
          <span>{t("firstname")}</span>
          <span>{t("lastname")}</span>
          <span>{t("email")}</span>
          <span>{t("phone_number")}</span>
          <span>{t("admin")}</span>
          <span>{t("actions")}</span>
        </div>
        {users.length === 0 ? (
          <p>{t("no_users_found")}</p>
        ) : (
          users.map((user) => (
            <div key={user._id} className="user-management-card">
              <span>{user.username}</span>
              <span>{user.firstname}</span>
              <span>{user.lastname}</span>
              <span>{user.email}</span>
              <span>{user.phoneNumber}</span>
              <span>{user.isAdmin ? "☑️" : "❌"}</span>
              <div>
                <button onClick={() => setEditUser(user)}>{t("edit")}</button>
                <button className="button-red" onClick={() => handleDeleteUser(user._id)}>
                  {t("delete")}
                </button>
              </div>
            </div>
          ))
        )}

        {editUser && (
          <div className="user-management-card">
            <input type="text" value={editUser.username} disabled />
            <input type="text" value={editUser.firstname} onChange={(e) => setEditUser({ ...editUser, firstname: e.target.value })} />
            <input type="text" value={editUser.lastname} onChange={(e) => setEditUser({ ...editUser, lastname: e.target.value })} />
            <input type="email" value={editUser.email} onChange={(e) => setEditUser({ ...editUser, email: e.target.value })} />
            <input type="tel" value={editUser.phoneNumber} onChange={(e) => setEditUser({ ...editUser, phoneNumber: e.target.value })} />
            <input type="password" value={editUser.password} onChange={(e) => setEditUser({ ...editUser, password: e.target.value })} />
            <label>
              {t("admin")}
              <input type="checkbox" checked={editUser.isAdmin} onChange={(e) => setEditUser({ ...editUser, isAdmin: e.target.checked })} />
            </label>
            <button onClick={handleUpdateUser}>{t("update_user")}</button>
          </div>
        )}

        <div className="user-management-card">
          <input type="text" placeholder={t("firstname")} value={newUser.firstname} onChange={(e) => setNewUser({ ...newUser, firstname: e.target.value })} />
          <input type="text" placeholder={t("lastname")} value={newUser.lastname} onChange={(e) => setNewUser({ ...newUser, lastname: e.target.value })} />
          <input type="text" placeholder={t("username")} value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} />
          <input type="email" placeholder={t("email")} value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
          <input type="tel" placeholder={t("phone_number")} value={newUser.phoneNumber} onChange={(e) => setNewUser({ ...newUser, phoneNumber: e.target.value })} />
          <label>
            {t("admin")}
            <input type="checkbox" checked={newUser.isAdmin} onChange={(e) => setNewUser({ ...newUser, isAdmin: e.target.checked })} />
          </label>
          <input type="password" placeholder={t("password")} value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
          <button onClick={handleAddUser}>{t("add_user")}</button>
        </div>

        {/* Sichtbarer Divider */}
        <div className="divider" />

        <h1 style={{ marginTop: "0px"}}>{t("invite_user")}</h1>
        <div className="user-management-card invite-user-card">
          <div className="invite-user-fields">
            <input
              className="invite-user-input"
              value={inviteUsername}
              onChange={e => setInviteUsername(e.target.value)}
              placeholder={t("username") || "Username"}
              autoComplete="off"
            />
            <input
              className="invite-user-input"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder={t("email") || "E-Mail"}
              type="email"
              autoComplete="off"
            />
            <button
              className="button-violet"
              onClick={handleInvite}
              disabled={!inviteUsername || !inviteEmail}
            >
              {t("invite_user") || "Nutzer einladen"}
            </button>
          </div>
          {inviteMsg && (
            <div
              className={
                `invite-user-msg ${
                  inviteMsg === "invite_sent" ||
                  inviteMsg.toLowerCase().includes("invite_sent") ||
                  inviteMsg.toLowerCase().includes("success")
                    ? "infoGreen"
                    : "infoRed"
                }`
              }
            >
              {inviteMsg === "invite_sent"
                ? t("invite_user_success")
                : inviteMsg}
            </div>
          )}
          <div className="invite-user-hint">
            {t("invite_user_hint")}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUserManagement;
