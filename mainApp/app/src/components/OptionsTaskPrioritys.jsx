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
          configName: "taskPrioritys",
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
        </div>
        {taskPriorities.length === 0 ? (
          <p>{t("no_task_priorities")}</p>
        ) : (
          <>
            {taskPriorities.map((priority, index) => (
              <div key={index} className="status-option-card">
                <span>{priority.name}</span>
                <span style={{ color: priority.color }}>{priority.color}</span>
                <span>{priority.kanbanIndex}</span>
                <span>{priority.isCritical ? t("☑️") : t("❌")}</span>
                <button className="button-red" onClick={() => handleDeletePriority(priority)}>
                  {t("delete")}
                </button>
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
