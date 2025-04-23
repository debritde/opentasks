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
  const [statuses, setStatuses] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [taskList, setTaskList] = useState(tasks);
  const [groupedTasks, setGroupedTasks] = useState(tasks);
  const [showConfetti, setShowConfetti] = useState(false);
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

    useEffect(() => {
      const grouped = tasks.reduce((acc, task) => {
        acc[task.status] = acc[task.status] || [];
        acc[task.status].push(task);
        return acc;
      }, {});
      setGroupedTasks(grouped);
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

  return (
    <div className="task-kanban-container" style={{ display: "flex", gap: "10px" }}>
    {showConfetti && <Confetti mode="boom" colors={["#ff0000","#00ff00", "#0000ff"]} width={window.innerWidth} height={window.innerHeight} />}

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
        <h3 className="kanban-header">{t("new")}</h3>
        {groupedTasks["new"] ? (groupedTasks["new"]).map((item, index) => ({ index, value: item })).sort((a, b) => (a.value.kanbanIndexVertical || a.index) - (b.value.kanbanIndexVertical || b.index)).map((task) => {
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
            >

              <div className="task-kanban-details">
                <span>{task.value.isSubTask ? "#" + task.value.parentTaskTicketNumber : ""}</span>
                <strong>{task.value.isSubTask ? "↳" : ""}{task.value.title}</strong>
                <div>{task.value.description || t("no_description")}</div>
  
                <hr style={{width: "100%", color: "grey", margin: "0px"}}/>

                <span>{t("created_at")}: {new Date(task.value.createdAt).toLocaleDateString()}</span>
                <span>{t("last_changed")}: {new Date(task.value.updatedAt).toLocaleDateString()}</span>

                <hr style={{width: "100%", color: "grey", margin: "0px"}}/>
                
                <span>#{task.value.ticketNumber}</span>
              </div>
            </div>
          );
        }) : null }
      </div>
{        sortedStatuses.map(([statusKey, status]) => (
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
                  >
                    <div className="task-kanban-details">
                      <span>{task.value.isSubTask ? `#${task.value.parentTaskTicketNumber}` : ""}</span>
                      <strong>{task.value.isSubTask ? "↳" : ""}{task.value.title}</strong>
                      <div>{task.value.description || t("no_description")}</div>
                      
                      <hr style={{ width: "100%", color: "grey", margin: "0px" }} />
                      
                      <span>{t("created_at")}: {new Date(task.value.createdAt).toLocaleDateString()}</span>
                      <span>{t("last_changed")}: {new Date(task.value.updatedAt).toLocaleDateString()}</span>
                      
                      <hr style={{ width: "100%", color: "grey", margin: "0px" }} />
                      
                      <span>#{task.value.ticketNumber}</span>
                    </div>
                  </div>
                );
              })}
          </div>
        ))}

  </div>
  );
};

export default TaskKanbanView;
