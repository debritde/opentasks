import React, { useEffect, useState } from "react";
import Select from "react-select";
import config from "../config/config.json";
import { useTranslation } from "react-i18next";

const apiUrl = import.meta.env.VITE_APP_API_URL || "http://localhost:3001";

const TaskGridView = ({ tasks, onTaskClick }) => {
  const [statuses, setStatuses] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [expandedTasks, setExpandedTasks] = useState({});
  const [showDoneTasks, setShowDoneTasks] = useState(false);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const token = localStorage.getItem("token");

    fetch(`${apiUrl}/config/taskStatuses`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token,
      },
    })
      .then((res) => res.json())
      .then((data) => setStatuses(data))
      .catch((err) => console.error("Fehler beim Laden der Statuskonfiguration:", err));

    fetch(`${apiUrl}/config/taskPriorities`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token,
      },
    })
      .then((res) => res.json())
      .then((data) => setPriorities(data))
      .catch((err) => console.error("Fehler beim Laden der Prioritätskonfiguration:", err));
  }, []);

  const getStatusInfo = (taskStatus) => {
    if(statuses.length > 0){
      const status = statuses.find((s) => s.name === taskStatus);
      return status || { name: taskStatus, color: "#ddd" };
    }
    else {
      return { name: taskStatus, color: "#ddd" };
    }
  };

  const getPriorityInfo = (taskPriority) => {
    if(priorities.length > 0){
      const priority = priorities.find((s) => s.name === taskPriority);
      return priority || { name: taskPriority, color: "#ddd" };
    }
    else {
      return { name: taskPriority, color: "#ddd" };
    }
  };

  const toggleSubtasks = (taskId) => {
    console.log(expandedTasks)
    setExpandedTasks((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const filteredTasks = tasks.filter((task) => showDoneTasks || !task.isDone);

  const truncate = (text, maxLength = 100) => {
    if (!text) return "";
    return text.length > maxLength ? text.slice(0, maxLength) + "…" : text;
  };

  return (
    <div className="task-list-container">
      <h2 className="task-list-title">Task-Liste</h2>
      <button style={{marginBottom: "10px"}} onClick={() => setShowDoneTasks(!showDoneTasks)}>
        {showDoneTasks ? t("hide_done_tasks") : t("show_done_tasks")}
      </button>
      <ul className="task-grid">
        {filteredTasks.length === 0 ? (
          <p className="task-description">{t("no_tasks_available")}</p>
        ) : (
          filteredTasks.filter((task) => !task.isSubTask).map((task) => {
            const status = getStatusInfo(task.status);
            const priority = getPriorityInfo(task.priority);
            const hasSubtasks = task.subtaskIds && task.subtaskIds.length > 0;

            return (
              <li
                key={task.id}
                className="task-item"
                style={{ borderLeft: `6px solid ${priority.color || "#ddd"}` }}
              >
                <div className="main-task-container">
                  <div className="task-details" onClick={() => onTaskClick(task)}>
                    <span className="task-title">{task.title}</span>
                    <span className="task-description multiline">
                      {truncate(task.description || t("no_description"))}
                    </span>
                    <div className="task-dates">
                      <span className="task-date">{t("created_at")}: {new Date(task.createdAt).toLocaleDateString()}</span>
                      <span className="task-date">{t("last_changed")}: {new Date(task.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="task-meta-row">
                    <div className="task-meta">
                      <span className="task-badge task-status" style={{ backgroundColor: status.color }}>{status.name}</span>
                      <span className="task-badge task-ticket-number">#{task.ticketNumber}</span>
                    </div>
                    {hasSubtasks && (
                      <button className="show-subtasks-btn" onClick={() => toggleSubtasks(task._id)}>
                        {expandedTasks[task._id] ? "−" : "+"}
                      </button>
                    )}
                  </div>
                </div>
                {expandedTasks[task._id] && hasSubtasks && (
                  <div className="subtask-container">
                    <ul className="subtask-list">
                      {tasks.filter(t => task.subtaskIds.some(sub => sub._id === t._id)).map((subtask) => {
                        const subtaskStatus = getStatusInfo(subtask.status);
                        const subtaskPriority = getPriorityInfo(subtask.priority);

                        return (
                          <li 
                            key={subtask.id} 
                            className="subtask-item"
                            style={{ borderLeft: `4px solid ${subtaskPriority.color || "#ddd"}` }}
                            onClick={() => onTaskClick(subtask)}
                          >
                            <div className="subtask-details">
                              <span className="subtask-title">{subtask.title}</span>
                              <span className="subtask-description multiline">
                                {truncate(subtask.description || t("no_description"))}
                              </span>
                              <div className="subtask-dates">
                                <span className="subtask-date">{t("created_at")}: {new Date(subtask.createdAt).toLocaleDateString()}</span>
                                <span className="subtask-date">{t("last_changed")}: {new Date(subtask.updatedAt).toLocaleDateString()}</span>
                              </div>
                              <span className="task-ticket-number">#{subtask.ticketNumber}</span>
                            </div>
                            <div className="subtask-meta">
                              <span
                                className="subtask-status"
                                style={{ backgroundColor: subtaskStatus.color, color: "#1a1a1a" }}
                              >
                                {subtaskStatus.name}
                              </span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
};

export default TaskGridView;
