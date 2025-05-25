import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import config from "../config/config.json";
import "../i18n";

const apiUrl = import.meta.env.VITE_APP_API_URL || "http://localhost:3001";

const ProjectStatusConfig = () => {
  const { t } = useTranslation();
  const [kanbanIndex, setKanbanIndex] = useState([]);
  const [taskStatuses, setTaskStatuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newStatus, setNewStatus] = useState("");
  const [newColor, setNewColor] = useState("#000000");
  const [newIsDone, setNewIsDone] = useState(false);

  // Editier-States
  const [editIndex, setEditIndex] = useState(null);
  const [editStatus, setEditStatus] = useState({ name: "", color: "#000000", isDone: false });

  useEffect(() => {
    const fetchConfig = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const response = await fetch(`${apiUrl}/config/projectStatuses`, {
          method: "GET",
          headers: { "Authorization": `${token}` }
        });
        const data = await response.json();
        if (Array.isArray(data)) setTaskStatuses(data);
      } catch (error) {
        console.error(t("error_loading_task_status"), error);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [t]);

  const handleAddStatus = async () => {
    if (!newStatus) return;

    const newEntry = {
      name: newStatus,
      color: newColor,
      kanbanIndex: kanbanIndex,
      isDone: newIsDone
    };
    const updatedStatuses = [...taskStatuses, newEntry];
    await updateConfig(updatedStatuses);
    setNewStatus("");
    setNewColor("#000000");
    setNewIsDone(false);
  };

  const handleDeleteStatus = async (statusToDelete) => {
    const updatedStatuses = taskStatuses.filter(status => status.name !== statusToDelete.name);
    await updateConfig(updatedStatuses);
  };

  const updateConfig = async (statuses) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch(`${apiUrl}/config`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `${token}`
        },
        body: JSON.stringify({
          configName: "projectStatuses",
          configValue: statuses
        })
      });

      const data = await response.json();
      if (data.config?.configValue) setTaskStatuses(data.config.configValue);
    } catch (error) {
      console.error(t("error_updating_task_status"), error);
    }
  };

  const handleEditClick = (index) => {
    setEditIndex(index);
    setEditStatus({ ...taskStatuses[index] });
  };

  const handleEditSave = async () => {
    const updated = [...taskStatuses];
    updated[editIndex] = { ...editStatus };
    await updateConfig(updated);
    setTaskStatuses(updated);
    setEditIndex(null);
  };

  const handleEditCancel = () => setEditIndex(null);

  if (loading) return <div>{t("loading_task_status")}</div>;

  return (
    <div>
      <h1>{t("task_status_config")}</h1>
      <div className="status-option-container">
        <div className="status-option-card">
          <span>{t("status_name")}</span>
          <span>{t("status_color")}</span>
          <span>{t("mark_as_done")}</span>
          <span>{t("delete")}</span>
          <span>{t("edit")}</span>
        </div>
        {taskStatuses.length === 0 ? (
          <p>{t("no_task_statuses")}</p>
        ) : (
          <>
            {taskStatuses.map((status, idx) => (
              <div className="status-option-card" key={idx}>
                {editIndex === idx ? (
                  <>
                    <input
                      type="text"
                      value={editStatus.name}
                      onChange={e => setEditStatus({ ...editStatus, name: e.target.value })}
                    />
                    <input
                      type="color"
                      value={editStatus.color}
                      onChange={e => setEditStatus({ ...editStatus, color: e.target.value })}
                    />
                    <input
                      type="checkbox"
                      checked={editStatus.isDone}
                      onChange={e => setEditStatus({ ...editStatus, isDone: e.target.checked })}
                    />
                    <button className="button-small" onClick={handleEditSave}>{t("save")}</button>
                    <button className="button-small" onClick={handleEditCancel}>{t("cancel")}</button>
                  </>
                ) : (
                  <>
                    <span>{status.name}</span>
                    <span style={{ color: status.color }}>{status.color}</span>
                    <span>{status.isDone ? t("☑️") : t("❌")}</span>
                    <button className="button-red" onClick={() => handleDeleteStatus(status)}>
                      {t("delete")}
                    </button>
                    <button className="button-small" onClick={() => handleEditClick(idx)}>
                      {t("edit")}
                    </button>
                  </>
                )}
              </div>
            ))}
          </>
        )}
      </div>


      <div className="status-option-container">
        <div className="status-option-card">
          <input
            type="text"
            value={newStatus}
            placeholder={t("status_name")}
            onChange={(e) => setNewStatus(e.target.value)}
          />
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
          />
          <input
            type="checkbox"
            checked={newIsDone}
            onChange={(e) => setNewIsDone(e.target.checked)}
          />
          <button onClick={handleAddStatus}>{t("add_status")}</button>
      </div>
    </div>
  </div>
  );
};

export default ProjectStatusConfig;
