import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import config from "../config/config.json";
import "../i18n";

const apiUrl = import.meta.env.VITE_APP_API_URL || "http://localhost:3001";

const TaskPriorityConfig = () => {
  const { t } = useTranslation();
  const [kanbanIndex, setKanbanIndex] = useState([]);
  const [taskPriorities, setTaskPriorities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPriority, setNewPriority] = useState("");
  const [newColor, setNewColor] = useState("#000000");
  const [newIsCritical, setNewIsCritical] = useState(false);

  // Editier-States
  const [editIndex, setEditIndex] = useState(null);
  const [editPriority, setEditPriority] = useState({ name: "", color: "#000000", kanbanIndex: 0, isCritical: false });

  useEffect(() => {
    const fetchConfig = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const response = await fetch(`${apiUrl}/config/taskPriorities`, {
          method: "GET",
          headers: { "Authorization": `${token}` }
        });
        const data = await response.json();
        if (Array.isArray(data)) setTaskPriorities(data);
      } catch (error) {
        console.error(t("error_loading_task_priorities"), error);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, [t]);

  const handleAddPriority = async () => {
    if (!newPriority) return;

    const newEntry = {
      name: newPriority,
      color: newColor,
      kanbanIndex: kanbanIndex,
      isCritical: newIsCritical
    };
    const updatedPriorities = [...taskPriorities, newEntry];
    await updateConfig(updatedPriorities);
    setNewPriority("");
    setNewColor("#000000");
    setNewIsCritical(false);
  };

  const handleDeletePriority = async (priorityToDelete) => {
    const updatedPriorities = taskPriorities.filter(priority => priority.name !== priorityToDelete.name);
    await updateConfig(updatedPriorities);
  };

  // Editierfunktionen
  const handleEditClick = (index) => {
    setEditIndex(index);
    setEditPriority({ ...taskPriorities[index] });
  };

  const handleEditSave = async () => {
    const updated = [...taskPriorities];
    updated[editIndex] = { ...editPriority };
    await updateConfig(updated);
    setEditIndex(null);
  };

  const handleEditCancel = () => setEditIndex(null);

  const updateConfig = async (priorities) => {
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
          configName: "taskPriorities",
          configValue: priorities
        })
      });

      const data = await response.json();
      if (data.config?.configValue) setTaskPriorities(data.config.configValue);
    } catch (error) {
      console.error(t("error_updating_task_priorities"), error);
    }
  };

  if (loading) return <div>{t("loading_task_priorities")}</div>;

  return (
    <div>
      <h1>{t("task_priority_config")}</h1>
      <div className="status-option-container">
        <div className="status-option-card">
          <span>{t("priority_name")}</span>
          <span>{t("priority_color")}</span>
          <span>{t("kanban_order_position")}</span>
          <span>{t("mark_as_critical")}</span>
          <span>{t("delete")}</span>
          <span>{t("edit")}</span>
        </div>
        {taskPriorities.length === 0 ? (
          <p>{t("no_task_priorities")}</p>
        ) : (
          <>
            {taskPriorities.map((priority, index) => (
              <div key={index} className="status-option-card">
                {editIndex === index ? (
                  <>
                    <input
                      type="text"
                      value={editPriority.name}
                      onChange={e => setEditPriority({ ...editPriority, name: e.target.value })}
                    />
                    <input
                      type="color"
                      value={editPriority.color}
                      onChange={e => setEditPriority({ ...editPriority, color: e.target.value })}
                    />
                    <input
                      type="number"
                      value={editPriority.kanbanIndex}
                      onChange={e => setEditPriority({ ...editPriority, kanbanIndex: e.target.value })}
                    />
                    <input
                      type="checkbox"
                      checked={editPriority.isCritical}
                      onChange={e => setEditPriority({ ...editPriority, isCritical: e.target.checked })}
                    />
                    <button className="button-small" onClick={handleEditSave}>{t("save")}</button>
                    <button className="button-small" onClick={handleEditCancel}>{t("cancel")}</button>
                  </>
                ) : (
                  <>
                    <span>{priority.name}</span>
                    <span style={{ color: priority.color }}>{priority.color}</span>
                    <span>{priority.kanbanIndex}</span>
                    <span>{priority.isCritical ? t("☑️") : t("❌")}</span>
                    <button className="button-red" onClick={() => handleDeletePriority(priority)}>
                      {t("delete")}
                    </button>
                    <button className="button-small" onClick={() => handleEditClick(index)}>
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
            value={newPriority}
            placeholder={t("priority_name")}
            onChange={(e) => setNewPriority(e.target.value)}
          />
          <input
            type="color"
            value={newColor}
            onChange={(e) => setNewColor(e.target.value)}
          />
          <input
            type="number"
            value={kanbanIndex}
            onChange={(e) => setKanbanIndex(e.target.value)}
          />
          <input
            type="checkbox"
            checked={newIsCritical}
            onChange={(e) => setNewIsCritical(e.target.checked)}
          />
          <button onClick={handleAddPriority}>{t("add_priority")}</button>
        </div>
      </div>
    </div>
  );
};

export default TaskPriorityConfig;
