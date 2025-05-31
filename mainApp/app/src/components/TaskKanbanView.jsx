import React, { useEffect, useState } from "react";
import config from "../config/config.json";
import { useTranslation } from "react-i18next";
import Confetti from "react-confetti-boom";
import no from '../functions/no.js'
import bravo from '../functions/bravo.js'
import lol from '../functions/lol.js'
import spongebob from '../functions/spongebob.js'

const apiUrl = import.meta.env.VITE_APP_API_URL || "http://localhost:3001";

const TaskKanbanView = ({ tasks, onTaskClick }) => {
  // groupedTasks ist initial tasks, daher:
  const initialGrouped = tasks.reduce((acc, task) => {
    acc[task.status] = acc[task.status] || [];
    acc[task.status].push(task);
    return acc;
  }, {});
  const initialHasNewTasks = initialGrouped["new"] && initialGrouped["new"].length > 0;

  const [statuses, setStatuses] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [taskList, setTaskList] = useState(tasks);
  const [groupedTasks, setGroupedTasks] = useState(initialGrouped);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showNewColumn, setShowNewColumn] = useState(initialHasNewTasks);
  const { t, i18n } = useTranslation();

  const startFirework = () => {
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000); // Feuerwerk für 3 Sekunden
  };

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
      .then((data) => setPriorities(data || {}))
      .catch((err) => console.error("Fehler beim Laden der Prioritätskonfiguration:", err));
    }, []);

    // Aktualisiert groupedTasks, wenn sich taskList ändert
    useEffect(() => {
      const grouped = taskList.reduce((acc, task) => {
        acc[task.status] = acc[task.status] || [];
        acc[task.status].push(task);
        return acc;
      }, {});
      setGroupedTasks(grouped);
    }, [taskList]);

    // Synchronisiere taskList mit tasks, wenn sich tasks ändern
    useEffect(() => {
      setTaskList(tasks);
    }, [tasks]);

    const getGroupedTasks = async() => {
      const groupedTasks = await taskList.reduce((acc, task) => {
        acc[task.status] = acc[task.status] || [];
        acc[task.status].push(task);
        return acc;
      }, {});
      setGroupedTasks(groupedTasks)
    }

  const handleDragStart = (e, task) => {
    e.dataTransfer.setData("task", JSON.stringify(task));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = async (e, newStatus, isDone) => {
    await e.preventDefault();
    const taskData = await e.dataTransfer.getData("task");
    if (!taskData) return;

    if(isDone) {
      if (localStorage.easterEggMode == "true") {
        let actions = [bravo, lol, spongebob];
        let selected = actions.filter(() => Math.random() < 0.25); // Jede Funktion hat 50% Chance, ausgeführt zu werden
    
        if (selected.length === 0) {
            selected = [actions[Math.floor(Math.random() * actions.length)]]; // Mindestens eine Funktion ausführen
        }
    
        selected.forEach(func => func());
      }
      else {
        startFirework()
      }
    }

    const task = JSON.parse(taskData);

    const updatedTask = { ...task, status: newStatus };
    const updatedTasks = taskList.map((t) =>
      t._id === task._id ? updatedTask : t
    );
    setTaskList(updatedTasks);

    const token = localStorage.getItem("token");
    await fetch(`${apiUrl}/tasks/${task._id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token,
      },
      body: JSON.stringify({ status: newStatus, isDone: isDone }),
    })
      .then((res) => res.json())
      .then((updatedTask) => {
        console.log("Task-Status aktualisiert:", updatedTask);
      })
      .catch((err) => {
        console.error("Fehler beim Aktualisieren des Task-Status:", err)
      });

  };
  const handleVerticalDrop = async (e, targetTask) => {
    e.preventDefault();

    const sourceTaskData = await e.dataTransfer.getData("task");
    if (!sourceTaskData) return;
  
    const sourceTask = await JSON.parse(sourceTaskData);
  
    // Tausch der Indizes
    const sourceIndex = sourceTask.kanbanIndexVertical;
    const targetIndex = targetTask.kanbanIndexVertical;

    // Aktualisiere die lokalen Tasks
    const updatedTasks = await taskList.map((task) => {
      if (task._id === sourceTask._id) {
        return { ...task, kanbanIndexVertical: targetIndex };
      }
      if (task._id === targetTask._id) {
        return { ...task, kanbanIndexVertical: sourceIndex };
      }
      return task;
    });
  
    setTaskList(updatedTasks);
  
    // API-Aufrufe parallel ausführen
    const token = localStorage.getItem("token");
    const updateSource = await fetch(`${apiUrl}/tasks/${sourceTask._id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token,
      },
      body: JSON.stringify({ kanbanIndexVertical: targetIndex }),
    });
  
  
    await Promise.all([updateSource, updateTarget])
      .then(() => console.log("Indizes erfolgreich getauscht."))
      .catch((err) => console.error("Fehler beim Tausch der Indizes:", err));
  };
  
  
  

  const sortedStatuses = Object.entries(statuses).sort((a, b) => (a[1].kanbanIndex || 999) - (b[1].kanbanIndex || 999));

  const getPriorityInfo = (taskPriority) => {
    if(priorities.length > 0){
      const priority = priorities.find((s) => s.name === taskPriority);
      return priority || { name: taskPriority, color: "#ddd" };
    }
    else {
      return { name: taskPriority, color: "#ddd" };
    }
  };

  // Prüfen, ob es Tasks mit Status "new" gibt
  const hasNewTasks = groupedTasks["new"] && groupedTasks["new"].length > 0;

  useEffect(() => {
    if (hasNewTasks) setShowNewColumn(true);
  }, [hasNewTasks]);

  return (
    <div>
      {/* Toggle-Button immer zeigen, solange keine "new"-Tasks existieren */}
      {!hasNewTasks && (
        <div style={{ marginBottom: 12 }}>
          <button onClick={() => setShowNewColumn((v) => !v)}>
            {showNewColumn
              ? (t("hide_new_column") || "Hide 'New' column")
              : (t("show_new_column") || "Show 'New' column")}
          </button>
        </div>
      )}
      <div className="task-kanban-container" style={{ display: "flex", gap: "10px" }}>
        {showConfetti && <Confetti mode="boom" colors={["#ff0000","#00ff00", "#0000ff"]} width={window.innerWidth} height={window.innerHeight} />}

        {/* "New"-Spalte nur anzeigen, wenn sichtbar oder Tasks vorhanden */}
        {(showNewColumn || hasNewTasks) && (
          <div
            key="new"
            className="task-kanban-column"
            style={{
              borderTop: `5px solid #000000`,
              flex: 1,
              padding: "10px",
              minHeight: "300px"
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, "new", false)}
          >
            <div style={{display: "flex", justifyContent: "space-between", alignItems: "center"}}>
              <h3 className="kanban-header">{t("new")}</h3>
            </div>
            {hasNewTasks ? (groupedTasks["new"]).map((item, index) => ({ index, value: item }))
              .sort((a, b) => (a.value.kanbanIndexVertical || a.index) - (b.value.kanbanIndexVertical || b.index))
              .map((task) => {
                const priority = getPriorityInfo(task.value.priority);
                return (
                  <div
                    key={task.value._id}
                    className={task.value.isSubTask ? "subtask-kanban-item" : "task-kanban-item"}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.value)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleVerticalDrop(e, task.value)}
                    onClick={() => onTaskClick(task.value)}
                    style={{
                      borderLeft: `5px solid ${priority?.color || "#ddd"}`,
                    }}
                    title={
                      `${task.value.title}\n` +
                      (task.value.description ? `${task.value.description}\n` : "") +
                      `${t("created_at")}: ${new Date(task.value.createdAt).toLocaleDateString()}\n` +
                      `${t("last_changed")}: ${new Date(task.value.updatedAt).toLocaleDateString()}`
                    }
                  >
                    <div className="task-kanban-details" style={{gap: 2}}>
                      <div style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
                        <strong style={{fontSize: "1.05em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "70%"}}>
                          {task.value.isSubTask ? "↳" : ""}{task.value.title}
                        </strong>
                        <span style={{fontSize: "0.95em", color: "#888"}}>#{task.value.ticketNumber}</span>
                      </div>
                      <div className="task-kanban-description" style={{
                        fontSize: "0.95em",
                        color: "#666",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "100%",
                        marginBottom: 2
                      }}>
                        {task.value.description}
                      </div>
                      <div style={{display: "flex", alignItems: "center", gap: 6, marginTop: 2}}>
                        <span className="priority-label" style={{
                          background: priority.color, color: "#fff", borderRadius: 3, padding: "2px 6px", fontSize: "0.85em"
                        }}>{priority.name}</span>
                        <span style={{fontSize: "0.85em", color: "#aaa"}} title={t("created_at")}>
                          {new Date(task.value.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              }) : null}
          </div>
        )}
        {sortedStatuses.map(([statusKey, status]) => (
          <div
            key={status.name}
            className="task-kanban-column"
            style={{ borderTop: `5px solid ${status.color}`, flex: 1, padding: "10px", minHeight: "300px" }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => handleDrop(e, status.name, status.isDone)}
          >
            <h3 className="kanban-header">{status.name}</h3>
            {groupedTasks[status.name] && groupedTasks[status.name]
              .map((item, index) => ({ index, value: item }))
              .sort((a, b) => (a.value.kanbanIndexVertical || a.index) - (b.value.kanbanIndexVertical || b.index))
              .map((task) => {
                const priority = getPriorityInfo(task.value.priority);
                return (
                  <div
                    key={task.value._id}
                    className={task.value.isSubTask ? "subtask-kanban-item" : "task-kanban-item"}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.value)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => handleVerticalDrop(e, task.value)}
                    onClick={() => onTaskClick(task.value)}
                    style={{
                      borderLeft: `5px solid ${priority?.color || "#ddd"}`,
                    }}
                    title={
                      `${task.value.title}\n` +
                      (task.value.description ? `${task.value.description}\n` : "") +
                      `${t("created_at")}: ${new Date(task.value.createdAt).toLocaleDateString()}\n` +
                      `${t("last_changed")}: ${new Date(task.value.updatedAt).toLocaleDateString()}`
                    }
                  >
                    <div className="task-kanban-details" style={{gap: 2}}>
                      <div style={{display: "flex", alignItems: "center", justifyContent: "space-between"}}>
                        <strong style={{fontSize: "1.05em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "70%"}}>
                          {task.value.isSubTask ? "↳" : ""}{task.value.title}
                        </strong>
                        <span style={{fontSize: "0.95em", color: "#888"}}>#{task.value.ticketNumber}</span>
                      </div>
                      <div className="task-kanban-description" style={{
                        fontSize: "0.95em",
                        color: "#666",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        maxWidth: "100%",
                        marginBottom: 2
                      }}>
                        {task.value.description}
                      </div>
                      <div style={{display: "flex", alignItems: "center", gap: 6, marginTop: 2}}>
                        <span className="priority-label" style={{
                          background: priority.color, color: "#fff", borderRadius: 3, padding: "2px 6px", fontSize: "0.85em"
                        }}>{priority.name}</span>
                        <span style={{fontSize: "0.85em", color: "#aaa"}} title={t("created_at")}>
                          {new Date(task.value.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default TaskKanbanView;
