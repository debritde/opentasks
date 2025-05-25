import { useState, useEffect } from "react";
import Select from "react-select";
import config from "../config/config.json";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import DOMPurify from 'dompurify'
import no from '../functions/no.js'
import bravo from '../functions/bravo.js'
import lol from '../functions/lol.js'
import spongebob from '../functions/spongebob.js'
import { Collapse } from 'react-collapse';

const apiUrl = import.meta.env.VITE_APP_API_URL || "http://localhost:3001";

const TaskViewModal = ({ task, onClose }) => {
  const [title, setTitle] = useState(task ? task.title : "");
  const [createdAt, setCreatedAt] = useState(task ? task.createdAt : "");
  
  const [description, setDescription] = useState(task ? task.description : "");
  const [assignedUsers, setAssignedUsers] = useState(task ? task.assignedUsers : []);
  const [status, setStatus] = useState({name: task.status || ""});
  const [currentStatus, setCurrentStatus] = useState(task.status);
  const [priority, setPriority] = useState({name: task.priority || ""});
  const [attachments, setAttachments] = useState([]);
  const [startDate, setStartDate] = useState(task ? new Date(task.startDate): "");
  const [endDate, setEndDate] = useState(task ? new Date(task.endDate) : "");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdByUserId, setCreatedByUserId] = useState("");
  const [createdByEmailAddress, setCreatedByEmailAddress] = useState("");
  const [createdByFirstname, setCreatedByFirstname] = useState("");
  const [createdByLastname, setCreatedByLastname] = useState("");
  const [createdByUsername, setCreatedByUsername] = useState("");
  const [currentUserUserId, setCurrentUserUserId] = useState("");
  const [currentUserEmailAddress, setCurrentUserEmailAddress] = useState("");
  const [currentUserFirstname, setCurrentUserFirstname] = useState("");
  const [currentUserLastname, setCurrentUserLastname] = useState("");
  const [currentUserUsername, setCurrentUserUsername] = useState("");
  const [statuses, setStatuses] = useState([]);
  const [priorities, setPriorities] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [sendByMail, setSendByMail] = useState(false);
  const [sendToEmailAddress, setSendToEmailAddress] = useState(task.createdByEmailAddress || "");
  const [errorMessage, setErrorMessage] = useState("");
  const [project, setProject] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const { t, i18n } = useTranslation();
  const [customFields, setCustomFields] = useState(task && task.customFields ? task.customFields : []);
  const [projectCustomFields, setProjectCustomFields] = useState([]);
  const [mergedCustomFields, setMergedCustomFields] = useState([]);
  const [loadingCustomFields, setLoadingCustomFields] = useState(true);
  const [commentSortOrder, setCommentSortOrder] = useState("desc");


  const token = localStorage.getItem("token");
  const location = useLocation();
  const projectId = location.pathname.split("/").pop();

  const [timeEntries, setTimeEntries] = useState([]);
  const [tracking, setTracking] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [timeTrackingDescription, setTimeTrackingDescription] = useState("");
  const [elapsedTime, setElapsedTime] = useState("00:00:00");
  const [expandedEntries, setExpandedEntries] = useState({});
  const [showTimeTrackingCreate, setShowTimeTrackingCreate] = useState(false);
  
  const toggleEntryExpansion = (entryId) => {
    setExpandedEntries(prev => ({ ...prev, [entryId]: !prev[entryId] }));
  };

  useEffect(() => {
    fetchTimeEntries();
  }, [task, timeEntries]);

  useEffect(() => {
    console.log("status")
    console.log(status)
    setCurrentStatus(status);
  }, [status]);

  useEffect(() => {
    const storedTracking = JSON.parse(localStorage.getItem("trackingTimes")) || {};
    if (storedTracking[task._id]) {
      setTracking(true);
      setStartTime(new Date(storedTracking[task._id]));
    }
  }, [task]);


  useEffect(() => {
    let interval;
    if ((tracking && startTime) || (startTime && endTime)) {
      interval = setInterval(() => {
        const now = endTime ? endTime : new Date();
        const diff = Math.floor((now - startTime) / 1000);
        const hours = String(Math.floor(diff / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((diff % 3600) / 60)).padStart(2, '0');
        const seconds = String(diff % 60).padStart(2, '0');
        setElapsedTime(`${hours}:${minutes}:${seconds}`);
      }, 1000);
    } else {
      setElapsedTime("00:00:00");
    }
    return () => clearInterval(interval);
  }, [tracking, startTime, endTime]);

  const fetchTimeEntries = async () => {
    try {
      const response = await fetch(`${apiUrl}/tasks/${task._id}/time-tracking`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token,
        },
      });
      const data = await response.json();
      if (data.status === "success") {
        setTimeEntries(data.timeEntries);
      }
    } catch (error) {
      console.error("Fehler beim Abrufen der Zeiterfassungen:", error);
    }
  };

  const startTracking = () => {
    setTracking(true);
    const now = new Date();
    setStartTime(now);
    const storedTracking = JSON.parse(localStorage.getItem("trackingTimes")) || {};
    storedTracking[task._id] = now;
    localStorage.setItem("trackingTimes", JSON.stringify(storedTracking));
  };

  const stopTracking = () => {
    setTracking(false);
    const now = new Date();
    setEndTime(now);
    const storedTracking = JSON.parse(localStorage.getItem("trackingTimes")) || {};
    delete storedTracking[task._id];
    localStorage.setItem("trackingTimes", JSON.stringify(storedTracking));
  };

  const saveTracking = async () => {
    if (!startTime || !endTime) return;
    try {
      const response = await fetch(`${apiUrl}/tasks/${task._id}/time-tracking`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": localStorage.getItem("token"),
        },
        body: JSON.stringify({
          userId: localStorage.getItem("userId"),
          startTime,
          endTime,
          description: timeTrackingDescription,
        }),
      });
      const data = await response.json();
      if (data.status === "success") {
        fetchTimeEntries();
        setStartTime(null);
        setEndTime(null);
        setTimeTrackingDescription("");
      }
    } catch (error) {
      console.error("Fehler beim Speichern der Zeiterfassung:", error);
    }
  };

  const deleteTimeEntry = async (id) => {
    try {
      await fetch(`${apiUrl}/time-tracking/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": localStorage.getItem("token"),
        },
      });
      fetchTimeEntries();
    } catch (error) {
      console.error("Fehler beim Löschen der Zeiterfassung:", error);
    }
  };

  // ##### NEU: Custom Fields updaten, wenn sich der Task ändert
  useEffect(() => {
    if (task && task.customFields) {
      // Hier speichern wir den Task-Wert separat, damit wir den Merge vornehmen können
      setMergedCustomFields(task.customFields);
    }
  }, [task]);
    
    
  // Bestehende Custom Fields für das Projekt laden
  useEffect(() => {
    const fetchProjectCustomFields = async () => {
      try {
        const response = await fetch(`${apiUrl}/customFields/tasks?projectId=${projectId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": token,
          },
        });
        const data = await response.json();
        if (data.status === "success") {
          setProjectCustomFields(data.taskCustomFields);
        }
      } catch (error) {
        console.error("Fehler beim Laden der projectweiten Custom Fields", error);
      } finally {
        setLoadingCustomFields(false);
      }
    };

    fetchProjectCustomFields();
  }, [projectId, token]);
  
  useEffect(() => {
    console.log(projectCustomFields)
    if (projectCustomFields.length > 0) {
      const merged = projectCustomFields.map(fieldDef => {
        // Suchen, ob für diese Definition ein Wert im Task vorhanden ist
        const taskField = task && task.customFields
          ? task.customFields.find(tf => tf.customField?.toString() === fieldDef._id.toString())
          : null;
        return {
          ...fieldDef,
          value: taskField ? taskField.value : ""
        };
      });
      setMergedCustomFields(merged);
    }
  }, [projectCustomFields, task]);


  useEffect(() => {

    const token = localStorage.getItem("token");

    const assignedUsersMapped = assignedUsers.map(user => ({
      key: user._id,
      value: `${user.firstname} ${user.lastname} (${user.username})`,
      firstname: user.firstname,
      lastname: user.lastname,
      username: user.username
    }));

    setAssignedUsers(assignedUsersMapped)

    fetch(`${apiUrl}/config/taskStatuses`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        const newItem = { name: "new", color: "#ffcc00", kanbanIndex: "0", isDone: false };
        const updatedData = [...data, newItem];
        setStatuses(updatedData);
      })
      .catch((err) => console.error("Fehler beim Laden der Statuskonfiguration:", err));

    fetch(`${apiUrl}/config/taskPriorities`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token,
      },
    })
    .then((res) => res.json())
    .then((data) => {
      setPriorities(Array.isArray(data) ? data : []);
    })
    .catch((err) => {
      console.error("Fehler beim Laden der Prioritätskonfiguration:", err);
      setPriorities([]); // Fallback auf leeres Array bei Fehler
    });
    
    (getComments(task))
  }, [task]);
  
  const getComments = (task) => {    
    fetch(`${apiUrl}/tasks/${task.ticketNumber}/comments`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token,
      },
    })
      .then((res) => res.json())
      .then(async (data) => {
        if(data.comments && data.comments.length > 0) {
          const commentsWithUserInfo = await Promise.all(
            data.comments.map(async (comment) => {
              try {
                const userRes = await fetch(`${apiUrl}/users/${comment.createdByUserId}`, {
                  method: "GET",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": token,
                  },
                });
                if (userRes.ok) {
                  const userData = await userRes.json();
                  comment.createdByFirstname = `${userData.user.firstname}`;
                  comment.createdByLastname = `${userData.user.lastname} `;
                  comment.createdByUsername = `${userData.user.username}`;
                } else {
                  comment.createdByUser = "Unbekannter Benutzer";
                }
              } catch (error) {
                console.error("Fehler beim Abrufen von Benutzerdaten:", error);
                comment.createdByUser = "Fehler beim Laden";
              }
              return comment;
            })
          );
          // Sortierung nach aktuellem State
          const sorted = [...commentsWithUserInfo].sort((a, b) =>
            commentSortOrder === "desc"
              ? new Date(b.createdAt) - new Date(a.createdAt)
              : new Date(a.createdAt) - new Date(b.createdAt)
          );
          setComments(sorted);
        }
      })
      .catch((err) => console.error("Fehler beim Laden der Kommentare:", err));
  }

  // Kommentare neu sortieren, wenn sich die Sortierrichtung ändert
  useEffect(() => {
    setComments(prev =>
      [...prev].sort((a, b) =>
        commentSortOrder === "desc"
          ? new Date(b.createdAt) - new Date(a.createdAt)
          : new Date(a.createdAt) - new Date(b.createdAt)
      )
    );
  }, [commentSortOrder]);

  const handleAddComment = () => {
    const token = localStorage.getItem("token");

    fetch(`${apiUrl}/tasks/${task.ticketNumber}/comments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token,
      },
      body: JSON.stringify({
        ticketNumber: task.ticketNumber,
        commentText: newComment,
        sendByMail,
        emailAddress: sendByMail ? sendToEmailAddress : null,
        createdByEmailAddress: currentUserEmailAddress || null,
        createdByUserId: currentUserUserId || null
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setComments([data.comment, ...comments]);
        setNewComment("");
        setSendByMail(false);
      })
      .then(() => {
        getComments(task)
      })
      .catch((err) => console.error("Fehler beim Hinzufügen des Kommentars:", err));
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const fetchCreatedByUser = async () => {
      const createdByUserId = task.createdByUserId
      if(createdByUserId) {
        try {
          const response = await fetch(`${apiUrl}/users/${createdByUserId}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "Authorization": token
            }
          });
          if (!response.ok) {
            throw new Error("Fehler beim Abrufen der Benutzerinformationen");
          }
          const data = await response.json();
          setCreatedByUserId(data.user._id);
          setCreatedByEmailAddress(data.user.email);
          setSendToEmailAddress(data.user.email);
          setCreatedByFirstname(data.user.firstname || "");
          setCreatedByLastname(data.user.lastname || "");
          setCreatedByUsername(data.user.username || "");
        } 
        catch (err) {
          console.error(err);
          setCreatedByEmailAddress(task.createdByEmailAddress);
          setError("Fehler beim Abrufen der Benutzerinformationen.");
        }
      }
      else {
        setCreatedByUserId("");
        setCreatedByEmailAddress(task.createdByEmailAddress);
        setSendToEmailAddress(task.createdByEmailAddress);
        setCreatedByFirstname("");
        setCreatedByLastname("");
        setCreatedByUsername("");
      }
    }

    const fetchCurrentUser = async () => {
      try {
        // Ermitteln der UserID aus dem Token
        const tokenResponse = await fetch(`${apiUrl}/users/byLoginToken`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": token
          },
          body: JSON.stringify({ loginToken: token })
        });
    
        if (!tokenResponse.ok) {
          throw new Error("Fehler beim Abrufen der Benutzer-ID aus dem Token");
        }
    
        const tokenData = await tokenResponse.json();
        const currentUserId = tokenData.user._id;
    
        // Abrufen der Benutzerinformationen mit der ermittelten UserID
        const response = await fetch(`${apiUrl}/users/${currentUserId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": token
          }
        });
    
        if (!response.ok) {
          throw new Error("Fehler beim Abrufen der Benutzerinformationen");
        }
    
        const data = await response.json();
        setCurrentUserUserId(data.user._id);
        setCurrentUserEmailAddress(data.user.email);
        setCurrentUserFirstname(data.user.firstname || "");
        setCurrentUserLastname(data.user.lastname || "");
        setCurrentUserUsername(data.user.username || "");
      } catch (err) {
        console.error(err);
        setError("Fehler beim Abrufen der Benutzerinformationen.");
      }
    };
    

    fetchCreatedByUser();
    fetchCurrentUser();
  }, []);

  const updateTask = (field, value) => {
    if (localStorage.easterEggMode == "true" && (field == "title" && (title == "" || title == undefined))) {
      no()
      setError(t("error_title_required"))
    }
    else if (!localStorage.easterEggMode == "true" && (field == "title" && (title == "" || title == undefined))) {
      setError(t("error_title_required"))
    }
    else {
      if (localStorage.easterEggMode == "true" && (field == "isDone" && (value == true))) {
        let actions = [bravo, lol, spongebob];
        let selected = actions.filter(() => Math.random() < 0.25); // Jede Funktion hat 50% Chance, ausgeführt zu werden
    
        if (selected.length === 0) {
            selected = [actions[Math.floor(Math.random() * actions.length)]]; // Mindestens eine Funktion ausführen
        }
    
        selected.forEach(func => func());
      }

      fetch(`${apiUrl}/tasks/${task._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token,
        },
        body: JSON.stringify({ [field]: value }),
      })
        .then((res) => res.json())
        .then(() => {
          if (field === "title") setTitle(value);
          if (field === "description") setDescription(value);
          if (field === "startDate") {
            setStartDate(value);
          }
          if (field === "endDate") setEndDate(value);
        })
        .catch((err) => console.error("Fehler beim Aktualisieren des Tasks:", err));
      }
  };

  useEffect(() => {
    setAssignedUsers(task.assignedUsers || []);
    fetch(`${apiUrl}/projects/${projectId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": localStorage.getItem("token"),
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success" && data.project.members.length > 0) {
          console.log("DEBUG")
          Promise.all(
            data.project.members.map(member =>
              fetch(`${apiUrl}/users/${member._id}`, {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": localStorage.getItem("token"),
                },
              }).then(res => res.json())
            )
          )
          .then(usersData => {
            console.log(usersData)
            setUsers(usersData.map(userData => ({
              value: userData.user._id,
              label: `${userData.user.firstname} ${userData.user.lastname} (${userData.user.username})`
            })));
          });
        }
      })
      .catch((err) => console.error("Fehler beim Laden der Projektbenutzer:", err));
  }, [task]);

  const updateTaskMembers = async (newMembers) => {
    console.log("newMembers")
    console.log(newMembers)
    try {
      const response = await fetch(`${apiUrl}/tasks/${task._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `${token}`
        },
        body: JSON.stringify({ assignedUsers: newMembers.map(member => (member.value)) })
      });
      const data = await response.json();
      if (data.status === "success") {
        setAssignedUsers(newMembers);
      } else {
        console.error("Fehler beim Aktualisieren des Projekts", data.message);
      }
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Projekts", error);
    }
  };

  
  useEffect(() => {
    const fetchProject = async () => {
      try {
        const response = await fetch(`${apiUrl}/projects/${projectId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `${token}`
          }
        });
        const data = await response.json();
        setProject(data.project);
      } catch (error) {
        console.error("Fehler beim Laden des Projekts", error);
      }
    };
    fetchProject();
  }, [projectId, token]);
  
  useEffect(() => {
    const fetchProjectMembers = async () => {
      if (!project || !project.members) return;
      try {
        const memberDetails = await Promise.all(
          project.members.map(async (memberId) => {
            const response = await fetch(`${apiUrl}/user/${memberId}`, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `${token}`
              }
            });
            return response.json();
          })
        );
        setAssignedUsers(memberDetails.map(user => ({ value: { "$oid": user._id }, label: `${user.firstname} ${user.lastname} (${user.username})` })));
      } catch (error) {
        console.error("Fehler beim Laden der Mitgliederdetails", error);
      }
    };
    fetchProjectMembers();
  }, [project, token]);

  useEffect(() => {
    if (task && task._id) {
      fetch(`${apiUrl}/tasks/${task._id}/attachments`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": localStorage.getItem("token"),
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.status === "success") {
            setAttachments(data.attachments);
          }
        })
        .catch((err) => console.error("Fehler beim Laden der Anhänge:", err));
    }
  }, [task]);

  const handleDeleteTask = () => {
    if (window.confirm("Bist du sicher, dass du diesen Task löschen möchtest?")) {
      fetch(`${apiUrl}/tasks/${task._id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "Authorization": token },
      })
        .then((res) => res.json())
        .then(() => {
          alert("Task wurde erfolgreich gelöscht.");
          onDelete(task._id);
          onClose();
        })
        .catch((err) => console.error("Fehler beim Löschen des Tasks:", err));
    }
  };


  // ##### NEU: Funktion zum Aktualisieren eines einzelnen Custom Field-Werts
 const updateCustomField = async (index, newTitle, newValue) => {
    const updatedCustomFields = [...mergedCustomFields];
    updatedCustomFields[index].customField = mergedCustomFields[index]._id;
    updatedCustomFields[index].value = newValue;
    updatedCustomFields[index].title = newTitle;
    setMergedCustomFields(updatedCustomFields);
    // Hier aktualisieren wir den Task mit den gemergten Custom Fields
    fetch(`${apiUrl}/tasks/${task._id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token,
      },
      body: JSON.stringify({ customFields: updatedCustomFields }),
    })
      .then(res => res.json())
      .then(data => {
        // Optional: Rückmeldung verarbeiten
      })
      .catch(err => console.error("Fehler beim Aktualisieren der Custom Fields:", err));
  };


  
  return (
    <div className="modal-overlay">
      <div className="modal">
        <button onClick={onClose} className="modal-close">✕</button>
        <h2>{t("view_task")}</h2>

        {error && <p className="error-message">{error}</p>}

        <div className="modal-form">
          <div className="modal-row">
            <div className="modal-column">
              <label>{t("title")}:</label>
              {editMode ? (
                <input
                  type="text"
                  className="modal-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => updateTask("title", title)}
                />
              ) : (
                <p>{title}</p>
              )}
            </div>
            <div className="modal-column">
              <label>{t("description")}:</label>
              {editMode ? (
                <textarea
                  className="modal-input"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() => updateTask("description", description)}
                  rows={4}
                />
              ) : (
                <p style={{ whiteSpace: "pre-line" }}>{description}</p>
              )}
            </div>
          </div>

          <div className="modal-row">
            <div className="modal-column">
                <label>{t("status")}:</label>
                <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "10px" }}>
                  <div  
                    className="status-color-indicator"
                    style={{
                      backgroundColor: statuses.find(s => s.name === status.name)?.color,
                    }}
                  ></div>
                  <Select
                    options={statuses.map(s => ({ value: s.name, label: s.name, isDone: s.isDone }))}
                    value={status.name}
                    placeholder={status.name}
                    onChange={(option) => {
                      setStatus(option);
                      updateTask("status", option.value);
                      updateTask("isDone", option.isDone);
                    }}
                    isDisabled={false}
                  />
                </div>
              </div>
              <div className="modal-column">
              <label>{t("priorities")}:</label>
              {Array.isArray(priorities) && priorities.length > 0 ? (
                <Select
                  options={priorities.map(p => ({ value: p.name, label: p.name }))}
                  value={priorities.find(p => p.name === priority.name) || null}
                  onChange={(option) => updateTask("priority", option.value)}
                  isDisabled={!editMode}
                />
              ) : (
                <div className="error-message">
                  {t("no_priority_options_found")}
                  <br />
                  <button
                    className="button-small button-violet"
                    onClick={() => window.open('/admin', '_blank')}
                  >
                    {t("go_to_admin_prios")}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="modal-row">
            <div className="modal-column">
              <label>{t("assigned_users")}:</label>
                <Select
                  isMulti
                  options={users}
                  value={assignedUsers.map(user => ({
                    value: user._id || user.value,
                    label: user.label || `${user.firstname} ${user.lastname} (${user.username})`
                  }))}
                  onChange={updateTaskMembers}
                  placeholder={t("choose_assigned_users")}
                  isDisabled={true}
                />

            </div>
          </div>

          <div className="modal-row">
            <div className="modal-column">
              <label>{t("starts_at")}:</label>
              {editMode ? (
                <input
                  type="datetime-local"
                  className="modal-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  onBlur={() => updateTask("startDate", startDate)}
                />
              ) : (
                <p>{startDate ? new Date(startDate).toLocaleString() : t("no_date")}</p>
              )}
            </div>
            <div className="modal-column">
              <label>{t("ends_at")}:</label>
              {editMode ? (
                <input
                  type="datetime-local"
                  className="modal-input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  onBlur={() => updateTask("endDate", endDate)}
                />
              ) : (
                <p>{endDate ? new Date(endDate).toLocaleString() : t("no_date")}</p>
              )}
            </div>
          </div>            
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="button-red">{t("close")}</button>
          {editMode && (
            <button onClick={handleDeleteTask} className="button-red">{t("delete_task")}</button>
          )}
          <button onClick={() => setEditMode(!editMode)} className="button-violet">
            {editMode ? t("finish") : t("edit")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskViewModal;
