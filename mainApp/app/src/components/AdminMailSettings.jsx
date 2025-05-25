import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

const apiUrl = import.meta.env.VITE_APP_API_URL || "http://localhost:3001";

const defaultConfig = {
  host: "",
  port: "",
  user: "",
  pass: "",
  secure: false,
};

const AdminMailSettings = () => {
  const { t } = useTranslation();
  const [config, setConfig] = useState(defaultConfig);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      setMsg("");
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(`${apiUrl}/config/systemsmtpsettings`, {
          headers: { Authorization: token },
        });
        if (res.ok) {
          const data = await res.json();
          setConfig({ ...defaultConfig, ...data });
        }
      } catch {
        setMsg(t("error_loading_config") || "Fehler beim Laden der Konfiguration.");
      }
      setLoading(false);
    };
    fetchConfig();
    // eslint-disable-next-line
  }, [t]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setConfig((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiUrl}/config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({
          configName: "systemsmtpsettings",
          configValue: config,
        }),
      });
      if (res.ok) {
        setMsg(t("config_saved") || "Konfiguration gespeichert.");
      } else {
        setMsg(t("error_saving_config") || "Fehler beim Speichern.");
      }
    } catch {
      setMsg(t("error_saving_config") || "Fehler beim Speichern.");
    }
    setSaving(false);
  };

  if (loading) return <div>{t("loading_config") || "Lade Konfiguration..."}</div>;

  return (
    <div>
      <h1>{t("mail_settings") || "Mail Settings"}</h1>
      <div className="status-option-container">
        <form className="user-management-card" onSubmit={handleSubmit}>
          <input
            type="text"
            name="host"
            placeholder="SMTP Host"
            value={config.host}
            onChange={handleChange}
            required
          />
          <input
            type="number"
            name="port"
            placeholder="SMTP Port"
            value={config.port}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="user"
            placeholder="SMTP User"
            value={config.user}
            onChange={handleChange}
            required
          />
          <input
            type="password"
            name="pass"
            placeholder="SMTP Passwort"
            value={config.pass}
            onChange={handleChange}
            required
          />
          <label>
            Secure (SSL/TLS)
            <input
              type="checkbox"
              name="secure"
              checked={config.secure}
              onChange={handleChange}
            />
          </label>
          <button type="submit" disabled={saving}>
            {saving ? t("saving") || "Speichern..." : t("save") || "Speichern"}
          </button>
        </form>
        {msg && <div>{msg}</div>}
      </div>
    </div>
  );
};

export default AdminMailSettings;