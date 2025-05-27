import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import config from "../config/config.json";
import "../i18n";

const apiUrl = import.meta.env.VITE_APP_API_URL || "http://localhost:3001";

const AdminBackups = () => {
  const { t } = useTranslation();
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    try {
      const response = await fetch(`${apiUrl}/backup/list`, {
        method: "GET",
        headers: { "Authorization": `${token}` },
      });
      const data = await response.json();
      if (data.status === "success") setBackups(data.backups);
    } catch (error) {
      console.error(t("error_loading_backups"), error);
    } finally {
      setLoading(false);
    }
  };

  const createBackup = async () => {
    try {
      const response = await fetch(`${apiUrl}/backup/create`, {
        method: "POST",
        headers: { "Authorization": `${token}` },
      });
      const data = await response.json();
      if (data.status === "success") fetchBackups();
    } catch (error) {
      console.error(t("error_creating_backup"), error);
    }
  };

  const downloadBackup = async (fileName) => {
    try {
      const response = await fetch(`${apiUrl}/backup/export/${fileName}`, {
        method: "GET",
        headers: { "Authorization": `${token}` },
      });
      
      if (!response.ok) throw new Error(t("error_downloading_backup"));
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (error) {
      console.error(t("error_downloading_backup"), error);
    }
  };

  const restoreBackup = async (fileName) => {
    try {
      const response = await fetch(`${apiUrl}/backup/restore/${fileName}`, {
        method: "POST",
        headers: { "Authorization": `${token}` },
      });
      const data = await response.json();
      if (data.status === "success") alert(t("backup_restored"));
    } catch (error) {
      console.error(t("error_restoring_backup"), error);
    }
  };

  const uploadBackup = async () => {
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append("file", selectedFile);
    
    try {
      const response = await fetch(`${apiUrl}/backup/import`, {
        method: "POST",
        headers: { "Authorization": `${token}` },
        body: formData,
      });
      const data = await response.json();
      if (data.status === "success") fetchBackups();
    } catch (error) {
      console.error(t("error_uploading_backup"), error);
    }
  };

  const deleteBackup = async (fileName) => {
    if (window.confirm(t("confirm_delete_backup"))) {
      try {
        const response = await fetch(`${apiUrl}/backup/delete/${fileName}`, {
          method: "DELETE",
          headers: { "Authorization": `${token}` },
        });
        const data = await response.json();
        if (data.status === "success") fetchBackups();
      } catch (error) {
        console.error(t("error_deleting_backup"), error);
      }
    }
  };

  if (loading) return <div>{t("loading_backups")}</div>;
  
  return (
    <div className="backups-container">
      <h1>{t("backups")}</h1>
      <div className="infoRed">{t("backups_warning_message")}</div>
      <div className="controls">
        <button onClick={createBackup}>{t("create_backup")}</button>
        <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} />
        <button onClick={uploadBackup}>{t("upload_backup")}</button>
      </div>
      <ul className="backup-list">
        {backups.length === 0 ? (
          <p>{t("no_backups_found")}</p>
        ) : (
          backups.map((fileName) => (
            <li key={fileName} className="backup-item">
              {fileName}
              <div className="backup-actions">
                <button onClick={() => downloadBackup(fileName)}>{t("download")}</button>
                <button onClick={() => restoreBackup(fileName)}>{t("restore")}</button>
                <button onClick={() => deleteBackup(fileName)}>{t("delete")}</button>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

export default AdminBackups;