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
      setPriorities(data || {});
    })
    .catch((err) => console.error("Fehler beim Laden der Prioritätskonfiguration:", err));
    
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
          setComments(commentsWithUserInfo.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        }
      })
      .catch((err) => console.error("Fehler beim Laden der Kommentare:", err));
  }

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
        <button className="button-small" onClick={() => setEditMode(!editMode)}>{editMode ? t("finish") : t("edit")}</button>
        <button className="button-small" onClick={() => setShowTimeTrackingCreate(!showTimeTrackingCreate)}>{t("time_tracking")}</button>

        <Collapse isOpened={showTimeTrackingCreate}>
          <div className="time-entry-create">
            <span>Startzeit: {startTime ? startTime.toLocaleTimeString() : "-"}</span>
            <span>Verstrichene Zeit: {elapsedTime}</span>
            <textarea 
              value={timeTrackingDescription} 
              onChange={(e) => setTimeTrackingDescription(e.target.value)}
              placeholder={t("enter_description")}
            />
            <div className="buttons">
              <button onClick={startTracking} disabled={tracking}>{t("start")}</button>
              <button onClick={stopTracking} disabled={!tracking}>{t("stop")}</button>
              <button onClick={saveTracking} disabled={!startTime || !endTime}>{t("save")}</button>
            </div>
          </div>
        </Collapse>
        <ul className="time-entry-list">
          {timeEntries.map(entry => (
            <li key={entry._id} className="time-entry-item">
              <button className="button-small" onClick={() => toggleEntryExpansion(entry._id)}>{t("show_details")}</button>
              {entry.duration} {t("minutes_short")} - {entry.description && entry.description.length > 10 ? entry.description.substring(0, 10) + "..." : entry.description}
              <div className="time-entry-details">
                <Collapse isOpened={!!expandedEntries[entry._id]}>
                  <table className="modal-table">
                    <tr>
                      <td>
                        {t("start")}
                      </td>
                      <td>
                        {new Date(entry.startTime).toLocaleString()}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        {t("end")}
                      </td>
                      <td>
                        {new Date(entry.endTime).toLocaleString()}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        {t("duration")}
                      </td>
                      <td>
                        {entry.duration} {t("minutes_short")}
                      </td>
                    </tr>
                    <tr>
                      <td>
                        {t("description")}
                      </td>
                      <td>
                        {entry.description}
                      </td>
                    </tr>
                    <button className="button-red button-small" onClick={() => deleteTimeEntry(entry._id)} style={{ alignSelf: "center" }}>{t("delete")}</button>
                  </table>
                </Collapse>
              </div>
            </li>
          ))}
        </ul>
        <h2>
          {editMode ? 
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => updateTask("title", title)}
            />
          :
            title
          }
        </h2>
        <table className="modal-table">
          <tbody>
            <tr>
              <td><strong>{t("task_id")}:</strong></td>
              <td>{task.ticketNumber || "Wenn hier keine TIcketnummer steht ist irgendwas ganz gewaltig am Arsch Bruder"}</td>
            </tr>
            <tr>
              <td><strong>{t("description")}:</strong></td>
              {editMode ? 
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => updateTask("description", description)}
                />
              :
                <td dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(description)}}></td>
              }

            </tr>
            <tr>
              <td><strong>{t("created_at")}:</strong></td>
              <td>{new Date(createdAt).toLocaleString()}</td>
            </tr>
            <tr>
              <td><strong>{t("last_changed")}:</strong></td>
              <td>{new Date(task.updatedAt).toLocaleString()}</td>
            </tr>
            <tr>
              <td><strong>{t("created_by")}:</strong></td>
              <td>{ createdByUserId ? `${createdByFirstname} ${createdByLastname} (${createdByUsername}) ${createdByEmailAddress ? "// " + createdByEmailAddress : ""}` : createdByEmailAddress} </td>
            </tr>

              <tr>
                <td><strong>{t("starts_at")}:</strong></td>
                {editMode ? 
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    onBlur={() => updateTask("startDate", startDate)}
                  />
                :
                  <td>{startDate ? new Date(startDate).toLocaleString() : "Kein Datum"}</td>
                }
              </tr>
              <tr>
                <td><strong>{t("ends_at")}:</strong></td>
                {editMode ? 
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    onBlur={() => updateTask("endDate", endDate)}
                  />
                :
                  <td>{new Date(task.endDate).toLocaleString()}</td>
                }

                </tr>

            <tr>
              <td><strong>{t("status")}:</strong></td>
              <td>
              <Select
                options={statuses.map(s => ({ value: s.name, label: s.name, isDone: s.isDone }))}
                value={status.name}
                placeholder={status.name}
                onChange={(option) => {
                  setStatus(statuses.find(s => s.name === option.value) || {});
                  updateTask("status", option.value);
                  updateTask("isDone", option.isDone);
                }}
              />


              </td>
            </tr>
            <tr>
              <td><strong>{t("priority")}:</strong></td>
              <td>
                <Select
                  options={priorities.length > 0 ? priorities.map(p => ({ value: p.name, label: p.name })) : []}
                  value={priorities.length > 0 && priorities.find(p => p.name === priority) ? { value: priority, label: priority } : null}
                  placeholder={priority?.name || "Select priority"}
                  onChange={(option) => updateTask("priority", option?.value)}
                />
              </td>
            </tr>
            <tr>
              <td><strong>{t("assigned_users")}:</strong></td>
              <td>
                <Select
                  isMulti
                  options={users}
                  value={assignedUsers.map(user => ({
                    value: user._id || user.value,
                    label: user.label || `${user.firstname} ${user.lastname} (${user.username})`
                  }))}
                  onChange={updateTaskMembers}
                  placeholder={t("choose_assigned_users")}
                />
              </td>
            </tr>
            <tr className="attachment-list">
            <td><strong>{t("attachments")}:</strong></td>
              <td>
                {attachments.length > 0 ? (
                  attachments.map((attachment) => (
                    <li key={attachment.fileId} className="attachment-item">
                      <a href={`${apiUrl}/files/${attachment.fileId}`} target="_blank" rel="noopener noreferrer">
                        {attachment.filename}
                      </a>
                    </li>
                  ))
                ) : (
                  t("no_attachments")
                )}
              </td>
            </tr>

        <tr>
          <td colSpan="2" style={{"textAlign": "center"}}>{t("custom_fields")}</td>
          </tr>
        {loadingCustomFields ? (
          <p>Lädt Custom Fields...</p>
        ) : mergedCustomFields && mergedCustomFields.length > 0 ? (
            <>
              {mergedCustomFields.map((field, index) => (
                <tr key={field._id || index}>
                  <td><strong>{field.title || "Field"}</strong>:{" "}</td>
                  <td>
                    {editMode ? (
                        field.type === "dropdown" ? (
                          <Select
                            options={(JSON.parse(field.options) || []).map(option => ({ value: option, label: option }))}
                            value={(JSON.parse(field.options) || []).find(option => option === field.value) ? { value: field.value, label: field.value } : null}
                            onChange={(selectedOption) => updateCustomField(index, field.title, selectedOption ? selectedOption.value : "")}
                          />
                        ) : field.type === "checkbox" ? (
                          <input
                            type="checkbox"
                            checked={field.value || false}
                            onChange={(e) => updateCustomField(index, field.title, e.target.checked)}
                          />
                        ) : (
                          <input
                            type={field.type}
                            value={field.value || ""}
                            onChange={(e) => updateCustomField(index, field.title, e.target.value)}
                          />
                        )
                      ) : (
                        field.type === "checkbox" ? (
                          <span>{field.value === true ? t("yes") : t("no")}</span>
                        ) : (
                          <span>{field.value}</span>
                        )
                      )}
                  </td>
                </tr>
              ))}
            </>
            ) : (
              <p>{t("no_custom_fields_available")}</p>
            )}
            </tbody>
            </table>

        <div className="comment-input-container">
          <h4>{t("new_comment")}</h4>
          <textarea className="comment-input" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder={t("add_comment") + "..."} />
          {project?.isServiceDesk && (
            <>
              <label>
                <input
                  type="checkbox"
                  checked={sendByMail}
                  onChange={() => setSendByMail(!sendByMail)}
                />
                {t("send_comment_via_email")}
              </label>
              {sendByMail && (
                <input
                  type="email"
                  className="email-input"
                  value={sendToEmailAddress}
                  onChange={(e) => setSendToEmailAddress(e.target.value)}
                  placeholder="E-Mail-Adresse"
                />
              )}
            </>
          )}
          <button onClick={handleAddComment} className="button-violet">{t("add_comment")}</button>
        </div>

        <h3>{t("comments")}</h3>
        <ul className="comment-list">
          {comments.map((comment) => (
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
                  {comment.mailSent ? t("mail_sent") : t("mail_not_sent")}
                </span>
              )}
            </div>
          </li>
          ))}
        </ul>


        <div className="modal-actions">
          <button onClick={onClose}>{t("close")}</button>
          <button onClick={handleDeleteTask} className="button-delete">{t("delete_task")}</button>
        </div>
      </div>
    </div>
  );
};

export default TaskViewModal;
