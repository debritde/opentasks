import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "../i18n";
import { useTranslation } from "react-i18next";

import config from "../config/config.json";

const apiUrl = import.meta.env.VITE_APP_API_URL || "http://localhost:3001";

const Search = ({ query }) => {
    const { t } = useTranslation();
    const [results, setResults] = useState({ projects: [], tasks: [], comments: [] });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [statuses, setStatuses] = useState([]);
    const [priorities, setPriorities] = useState([]);
  
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
  
    useEffect(() => {
        if (query.length > 0) {
            handleSearch(query);
        }
    }, [query]); // ✅ Jetzt wird bei jeder Änderung von query erneut gesucht

    const handleSearch = async (query) => {
        if (!query) return;
        setLoading(true);
        setError(null);

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${apiUrl}/search?query=${encodeURIComponent(query)}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": token,
                },
            });

            const data = await response.json();

            if (data.status === "success") {
                setResults(data.results);
            } else {
                setError(data.message);
            }
        } catch (err) {
            setError("Fehler bei der Suche");
        } finally {
            setLoading(false);
        }
    };

    const getStatusInfo = (taskStatus) => {
        const status = statuses.find((s) => s.name === taskStatus);
        return status || { name: taskStatus, color: "#ddd" };
      };
    
      const getPriorityInfo = (taskPriority) => {
        const priority = priorities.find((s) => s.name === taskPriority);
        return priority || { name: taskPriority, color: "#ddd" };
      };

    return (
        <div className="search-container">
            <h2>{t("search")}</h2>
            {loading && <p>Lädt...</p>}
            {error && <p className="error">{error}</p>}
            <div className="search-results">
                <h3>{t("projects")}</h3>
                <div className="projects-container">
                    {results.projects.map((project) => (
                        <Link onClick={() => query=""} key={project._id} to={`/project/view/${project._id}`}>
                            <div className="project-card">
                                <h3>{project.title}</h3>
                                <p>{project.description}</p>
                                <p><strong>{t("deadline")}:</strong> {new Date(project.deadline).toLocaleString()}</p>
                            </div>
                        </Link>
                    ))}
                </div>

                <h3>{t("tasks")}</h3>
                <div className="task-list-container">
                    <ul className="task-list">
                        {results.tasks.length === 0 ? (
                        <p className="task-description">{t("no_tasks_available")}</p>
                        ) : (
                        results.tasks.map((task) => {
                            const status = getStatusInfo(task.status);
                            const priority = getPriorityInfo(task.priority);

                            return (
                            <li
                                key={task.id}
                                className="task-item"
                                onClick={() => onTaskClick(task)}
                                style={{
                                borderLeft: `6px solid ${priority.color || "#ddd"}`,
                                }}
                            >
                                <div className="task-details">
                                <span className="task-title">{task.title}</span>
                                <span className="task-description">
                                    {task.description || "Keine Beschreibung"}
                                </span>
                                <span className="task-date">Erstellt: {new Date(task.createdAt).toLocaleDateString()}</span>
                                <span className="task-date">Geändert: {new Date(task.updatedAt).toLocaleDateString()}</span>
                                </div>
                                <div className="task-meta">
                                <span
                                    className="task-status"
                                    style={{
                                    backgroundColor: status.color,
                                    color: "#1a1a1a",
                                    }}
                                >
                                    {status.name}
                                </span>
                                </div>
                            </li>
                            );
                        })
                        )}
                    </ul>
                </div>

                <h3>{t("comments")}</h3>
                <ul className="comment-list">
                    {results.comments.map((comment) => (
                        <li key={comment._id} className="comment-item">
                        <div className="comment-item-text">{comment.commentText}</div>
                        <div className="comment-item-meta">
                        <p style={{ fontSize: "12px", color: "#666" }}>{t("created_at")}: {new Date(comment.createdAt).toLocaleString()}</p>
                        <p style={{ fontSize: "12px", color: "#666" }}>
                            {t("created_by")}: 
                            {comment.createdByUserId 
                            ? `${comment.createdByFirstname && comment.createdByFirstname !== "undefined" ? comment.createdByFirstname + " " : ""} 
                                ${comment.createdByLastname && comment.createdByLastname !== "undefined" ? comment.createdByLastname + " " : ""}`.replace("undefined", "") + 
                                (comment.createdByUsername ? ` (${comment.createdByUsername})` : "")
                            : comment.createdByEmailAddress || "Unbekannt"}
                        </p>





                            {comment.emailAddress && <p style={{ fontSize: "12px", color: "#666" }}>{t("sent_to")}: {comment.emailAddress}</p>}
                            {comment.sendByMail && (
                            <span 
                                className="mail-send-badge" 
                                style={{ 
                                backgroundColor: comment.mailSent ? "green" : "red", 
                                color: "white", 
                                padding: "4px 8px", 
                                borderRadius: "4px", 
                                fontSize: "12px", 
                                fontWeight: "bold" 
                                }}
                            >
                                {comment.mailSent ? "Mail sent" : "Mail not sent"}
                            </span>
                            )}
                        </div>
                        </li>
                    ))}
                    </ul>
            </div>
        </div>
    );
};

export default Search;
