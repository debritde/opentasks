import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

const apiUrl = import.meta.env.VITE_APP_API_URL || "http://localhost:3001";

export default function AcceptInvite() {
  const { t, i18n } = useTranslation();
  const { token } = useParams();
  const [password, setPassword] = useState("");
  const [passwordRepeat, setPasswordRepeat] = useState("");
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [language, setLanguage] = useState(i18n.language || "en");
  const [msg, setMsg] = useState("");
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleAccept = async (e) => {
    e.preventDefault();
    setMsg("");
    if (!password || password.length < 8) {
      setMsg(t("password_too_short") || "Password must be at least 8 characters.");
      return;
    }
    if (password !== passwordRepeat) {
      setMsg(t("passwords_do_not_match") || "Passwords do not match.");
      return;
    }
    if (!firstname || !lastname) {
      setMsg(t("fill_all_fields") || "Please fill in all required fields.");
      return;
    }
    try {
      const res = await fetch(`${apiUrl}/users/accept-invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, firstname, lastname, phoneNumber, language }),
      });
      const data = await res.json();
      if (data.status === "success") {
        setSuccess(true);
        setMsg(t("invite_accepted_success") || "Invitation accepted. You can now log in.");
        setTimeout(() => navigate("/login"), 2000);
      } else {
        setMsg(data.message || t("invite_accepted_error"));
      }
    } catch {
      setMsg(t("invite_accepted_error") || "Error accepting invitation.");
    }
  };

  return (
    <div className="login-container">
      <div className="login-box" style={{ maxWidth: 400 }}>
        <h2>{t("accept_invite") || "Accept Invitation"}</h2>
        <form className="accept-invite-form" onSubmit={handleAccept}>
          <input
            type="text"
            placeholder={t("firstname") || "Firstname"}
            value={firstname}
            onChange={e => setFirstname(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder={t("lastname") || "Lastname"}
            value={lastname}
            onChange={e => setLastname(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder={t("phone_number") || "Phone Number"}
            value={phoneNumber}
            onChange={e => setPhoneNumber(e.target.value)}
          />
          <select
            value={language}
            onChange={e => setLanguage(e.target.value)}
            required
          >
            <option value="en">{t("english") || "English"}</option>
            <option value="de">{t("german") || "German"}</option>
          </select>
          <input
            type="password"
            placeholder={t("new_password") || "New password"}
            value={password}
            onChange={e => setPassword(e.target.value)}
            minLength={8}
            required
          />
          <input
            type="password"
            placeholder={t("repeat_password") || "Repeat password"}
            value={passwordRepeat}
            onChange={e => setPasswordRepeat(e.target.value)}
            minLength={8}
            required
          />
          <button type="submit" className="button-violet" disabled={success}>
            {t("set_password") || "Set password"}
          </button>
        </form>
        {msg && (
          <div style={{ marginTop: 12, color: success ? "#16a34a" : "#dc2626" }}>
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}