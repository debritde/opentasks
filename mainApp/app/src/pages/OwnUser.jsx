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
      const response = await fetch(`${apiUrl}/me`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(formData),
      });
      if (!response.ok) {
        throw new Error("Failed to save user data");
      }
      setUser(formData);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save user data", error);
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

  if (!user) return <div>{t("loading")}</div>;

  return (
    <div className="admin-user-profile">
      {!isEditing ? (
        <div>
          <p>{t("firstname")}: {user.firstname}</p>
          <p>{t("lastname")}: {user.lastname}</p>
          <p>{t("username")}: {user.username}</p>
          <p>{t("email")}: {user.email}</p>
          <p>{t("phone_number")}: {user.phoneNumber}</p>
          <p>{t("register_date")}: {new Date(user.registerDate).toLocaleDateString()}</p>
          <p>{t("ldap_user")}: {user.isLDAPUser ? t("yes") : t("no")}</p>
          <p>{t("two_factor")}: {user.twoFactorActivated ? t("yes") : t("no")}</p>
          {user.image && <img src={user.image} alt={t("user_image")} />}
          <button onClick={() => setIsEditing(true)}>{t("edit")}</button>
        </div>
      ) : (
        <div>
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
          <button onClick={handleSave}>{t("save")}</button>
          <button onClick={() => setIsEditing(false)}>{t("cancel")}</button>
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