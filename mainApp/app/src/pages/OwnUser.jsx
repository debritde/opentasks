import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { GiEasterEgg } from "react-icons/gi";

const apiUrl = import.meta.env.VITE_APP_API_URL || "http://localhost:3001";

const OwnUser = () => {
  const [user, setUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [easterEggActive, setEasterEggActive] = useState(
    localStorage.getItem("easterEggMode") === "true"
  );
  const [password, setPassword] = useState("");
  const [passwordChangeMessage, setPasswordChangeMessage] = useState("");
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatNewPassword, setRepeatNewPassword] = useState("");
  const [passwordChangeError, setPasswordChangeError] = useState("");
  const { t } = useTranslation();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch(`${apiUrl}/me`, {
          headers: {
            Authorization: `${localStorage.getItem("token")}`,
          },
        });
        if (!response.ok) {
          throw new Error("Failed to fetch user data");
        }
        const data = await response.json();
        setUser(data);
        setFormData(data);
      } catch (error) {
        console.error("Failed to fetch user data", error);
      }
    };

    fetchUserData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleSave = async () => {
    try {
      const payload = { ...formData };
      if (password) {
        payload.password = await hashPassword(password);
      }
      const response = await fetch(`${apiUrl}/ownUser/update`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.status === "success") {
        setPasswordChangeMessage(t("password_changed_success"));
        setPassword("");
        setIsEditing(false);
        setUser(payload);
      } else {
        setPasswordChangeMessage(data.message || t("error_updating_user"));
      }
    } catch (error) {
      setPasswordChangeMessage(t("error_updating_user"));
    }
  };

  const handlePasswordChange = async () => {
    setPasswordChangeError("");
    if (!currentPassword || !newPassword || !repeatNewPassword) {
      setPasswordChangeError(t("fill_all_password_fields"));
      return;
    }
    if (newPassword !== repeatNewPassword) {
      setPasswordChangeError(t("passwords_do_not_match"));
      return;
    }
    try {
      const hashedCurrent = await hashPassword(currentPassword);
      const hashedNew = await hashPassword(newPassword);
      console.log("DEBUG")
      console.log(hashedCurrent, hashedNew);
      const response = await fetch(`${apiUrl}/ownUser/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          currentPassword: hashedCurrent,
          newPassword: hashedNew,
        }),
      });
      const data = await response.json();
      console.log("DEBUG 2")
      console.log(data);
      if (data.status === "success") {
        setPasswordChangeMessage(t("password_changed_success"));
        setCurrentPassword("");
        setNewPassword("");
        setRepeatNewPassword("");
        setShowPasswordChange(false);
      } else {
        setPasswordChangeError(data.message || t("error_updating_user"));
      }
    } catch (error) {
      setPasswordChangeError(t("error_updating_user: " + error));
    }
  };

  const toggleEasterEgg = () => {
    const newState = !easterEggActive;
    setEasterEggActive(newState);
    if (newState) {
      localStorage.setItem("easterEggMode", "true");
    } else {
      localStorage.removeItem("easterEggMode");
    }
  };

  const hashPassword = async (password) => {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest("SHA-512", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(byte => byte.toString(16).padStart(2, "0")).join("");
  };

  if (!user) return <div>{t("loading")}</div>;

  return (
    <div className="user-profile-container">
      {!isEditing ? (
        <div className="user-profile-card">
          <div className="user-profile-header">
            {user.image && <img src={user.image} alt={t("user_image")} className="user-profile-image" />}
            <h2>{user.firstname} {user.lastname}</h2>
            <p className="user-profile-username">@{user.username}</p>
          </div>
          <div className="user-profile-details">
            <p><strong>{t("email")}:</strong> {user.email}</p>
            <p><strong>{t("phone_number")}:</strong> {user.phoneNumber}</p>
            <p><strong>{t("register_date")}:</strong> {new Date(user.registerDate).toLocaleDateString()}</p>
            <p><strong>{t("ldap_user")}:</strong> {user.isLDAPUser ? t("yes") : t("no")}</p>
            <p><strong>{t("two_factor")}:</strong> {user.twoFactorActivated ? t("yes") : t("no")}</p>
          </div>
          <div className="user-profile-actions">
            <button className="button-violet" onClick={() => setIsEditing(true)}>{t("edit")}</button>
            <button className="button-red" onClick={() => setShowPasswordChange(true)}>{t("change_password")}</button>
          </div>
        </div>
      ) : (
        <div className="user-profile-edit">
          <h3>{t("edit_profile")}</h3>
          <input
            type="text"
            name="firstname"
            value={formData.firstname}
            onChange={handleInputChange}
            placeholder={t("firstname")}
          />
          <input
            type="text"
            name="lastname"
            value={formData.lastname}
            onChange={handleInputChange}
            placeholder={t("lastname")}
          />
          <input
            type="text"
            name="username"
            value={formData.username}
            onChange={handleInputChange}
            placeholder={t("username")}
          />
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder={t("email")}
          />
          <input
            type="text"
            name="phoneNumber"
            value={formData.phoneNumber}
            onChange={handleInputChange}
            placeholder={t("phone_number")}
          />
          <div className="user-profile-edit-actions">
            <button className="button-violet" onClick={handleSave}>{t("save")}</button>
            <button className="button-red" onClick={() => setIsEditing(false)}>{t("cancel")}</button>
          </div>
        </div>
      )}
      {showPasswordChange && (
        <div className="user-profile-password-change">
          <h3>{t("change_password")}</h3>
          <input
            type="password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            placeholder={t("current_password")}
          />
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder={t("new_password")}
          />
          <input
            type="password"
            value={repeatNewPassword}
            onChange={e => setRepeatNewPassword(e.target.value)}
            placeholder={t("repeat_new_password")}
          />
          <div className="user-profile-password-actions">
            <button className="button-violet" onClick={handlePasswordChange}>{t("save")}</button>
            <button className="button-red" onClick={() => setShowPasswordChange(false)}>{t("cancel")}</button>
          </div>
          {passwordChangeError && <p className="error-message">{passwordChangeError}</p>}
          {passwordChangeMessage && <p className="success-message">{passwordChangeMessage}</p>}
        </div>
      )}
      <GiEasterEgg className="easter-egg"
        onClick={toggleEasterEgg}
        style={{
          position: "absolute",
          bottom: "1vw",
          right: "1vw",
          width: "30px",
          height: "30px",
          fill: easterEggActive ? "red" : "black",
          borderRadius: "50%",
          cursor: "pointer",
      }}/>
    </div>
  );
};

export default OwnUser;