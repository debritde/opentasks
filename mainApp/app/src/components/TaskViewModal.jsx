import React, { useState, useEffect, useMemo } from "react";
import Select from "react-select";
import config from "../config/config.json";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import DOMPurify from 'dompurify'
import no from '../functions/no.js'
import bravo from '../functions/bravo.js'
import lol from '../functions/lol.js'
import spongebob from '../functions/spongebob.js'
import { Collapse } from 'react-collapse';
import ReactMarkdown from "react-markdown";
import { MentionsInput, Mention } from "react-mentions";

const apiUrl = import.meta.env.VITE_APP_API_URL || "http://localhost:3001";

const TaskViewModal = ({ task, onClose }) => {
  const [title, setTitle] = useState(task ? task.title : "");
  const [createdAt, setCreatedAt] = useState(task ? task.createdAt : "");
  
  const [description, setDescription] = useState(task ? task.description : "");
  const [assignedUsers, setAssignedUsers] = useState(task ? task.assignedUsers : []);
  const [status, setStatus] = useState({name: task.status || ""});
  const [currentStatus, setCurrentStatus] = useState(task.status);
  const [priority, setPriority] = useState({ name: task.priority || "" });
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
  const [currentUserIsAdmin, setCurrentUserIsAdmin] = useState(false);
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
  const [showTimeTracking, setShowTimeTracking] = useState(false);
  const [manualDuration, setManualDuration] = useState("00:00:00");
  const [userSuggestions, setUserSuggestions] = useState([]);

  // Hilfsfunktion zum Umwandeln von hh:mm:ss in Sekunden
  const parseDuration = (str) => {
    const [h, m, s] = str.split(":").map(Number);
    return h * 3600 + m * 60 + s;
  };
  // Hilfsfunktion zum Umwandeln von Sekunden in hh:mm:ss
  const formatDuration = (sec) => {
    const h = String(Math.floor(sec / 3600)).padStart(2, "0");
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, "0");
    const s = String(sec % 60).padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  const toggleEntryExpansion = (entryId) => {
    setExpandedEntries(prev => ({ ...prev, [entryId]: !prev[entryId] }));
  };

  useEffect(() => {
    fetchTimeEntries();
  }, [task]);

  useEffect(() => {
    console.log("status")
    console.log(status)
    setCurrentStatus(status);
  }, [status]);

  useEffect(() => {
    const storedTracking = JSON.parse(localStorage.getItem("trackingTimes")) || {};
    if (storedTracking[task._id]) {
      setTracking(true);
      // Korrigiert: Zugriff auf das .start Feld!
      setStartTime(new Date(storedTracking[task._id].start));
    }
  }, [task]);


  useEffect(() => {
    let interval;
    if ((tracking && startTime) || (startTime && endTime)) {
      interval = setInterval(() => {
        const now = endTime ? endTime : new Date();
        const diff = Math.floor((now - startTime) / 1000);
        setElapsedTime(formatDuration(diff));
        if (tracking) setManualDuration(formatDuration(diff));
      }, 1000);
    } else {
      setElapsedTime("00:00:00");
      if (!tracking) setManualDuration("00:00:00");
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
        // Für jeden TimeEntry Userdaten nachladen
        const entriesWithUser = await Promise.all(
          data.timeEntries.map(async (entry) => {
            try {
              const userRes = await fetch(`${apiUrl}/users/${entry.userId}`, {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": token,
                },
              });
              if (userRes.ok) {
                const userData = await userRes.json();
                entry.createdByFirstname = userData.user.firstname || "";
                entry.createdByLastname = userData.user.lastname || "";
                entry.createdByUsername = userData.user.username || "";
              } else {
                entry.createdByFirstname = "";
                entry.createdByLastname = "";
                entry.createdByUsername = "Unbekannt";
              }
            } catch (err) {
              entry.createdByFirstname = "";
              entry.createdByLastname = "";
              entry.createdByUsername = "Fehler";
            }
            return entry;
          })
        );
        setTimeEntries(entriesWithUser);
      }
    } catch (error) {
      console.error("Fehler beim Abrufen der Zeiterfassungen:", error);
    }
  };

  // Timer-Start
  const startTracking = () => {
    setTracking(true);
    const now = new Date();
    setStartTime(now);
    setManualDuration("00:00:00");
    // Speichere Task-ID, Startzeit und Titel im trackingTimes
    const storedTracking = JSON.parse(localStorage.getItem("trackingTimes")) || {};
    {console.log(task)}
    storedTracking[task._id] = { start: now, title: task.title, ticketNumber: task.ticketNumber };
    console.log(storedTracking[task._id])
    localStorage.setItem("trackingTimes", JSON.stringify(storedTracking));
  };

  // Timer-Stopp
  const stopTracking = () => {
    setTracking(false);
    const now = new Date();
    setEndTime(now);
    const storedTracking = JSON.parse(localStorage.getItem("trackingTimes")) || {};
    delete storedTracking[task._id];
    localStorage.setItem("trackingTimes", JSON.stringify(storedTracking));
  };

  // Speichern (Timer oder manuell)
  const saveTracking = async () => {
    let start = startTime;
    let end = endTime;
    if (!tracking && manualDuration && manualDuration !== "00:00:00") {
      // Manueller Eintrag: jetzt als Endzeit, Dauer zurückrechnen
      end = new Date();
      start = new Date(end - parseDuration(manualDuration) * 1000);
    }
    if (!start || !end) return;
    try {
      const response = await fetch(`${apiUrl}/tasks/${task._id}/time-tracking`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": localStorage.getItem("token"),
        },
        body: JSON.stringify({
          userId: localStorage.getItem("userId"),
          startTime: start,
          endTime: end,
          description: timeTrackingDescription,
        }),
      });
      const data = await response.json();
      if (data.status === "success") {
        fetchTimeEntries();
        setStartTime(null);
        setEndTime(null);
        setTimeTrackingDescription("");
        setManualDuration("00:00:00");
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
        const newItem = { name: t("new"), color: "#ffcc00", kanbanIndex: "0", isDone: false };
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
                  if (userData && userData.user) {
                    comment.createdByFirstname = `${userData.user.firstname || ""}`;
                    comment.createdByLastname = `${userData.user.lastname || ""}`;
                    comment.createdByUsername = `${userData.user.username || ""}`;
                  } else {
                    comment.createdByFirstname = "";
                    comment.createdByLastname = "";
                    comment.createdByUsername = "Unbekannt";
                  }
                } else {
                  comment.createdByFirstname = "";
                  comment.createdByLastname = "";
                  comment.createdByUsername = "Unbekannt";
                }
              } catch (error) {
                console.error("Fehler beim Abrufen von Benutzerdaten:", error);
                comment.createdByFirstname = "";
                comment.createdByLastname = "";
                comment.createdByUsername = "Fehler";
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

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm(t("confirm_delete_comment") || "Kommentar wirklich löschen?")) return;
    try {
      const response = await fetch(`${apiUrl}/comments/${commentId}`, {
        method: "DELETE",
        headers: {
          "Authorization": token,
        },
      });
      const data = await response.json();
      if (data.status === "success") {
        setComments(comments.filter(c => c._id !== commentId));
      } else {
        alert(data.message || "Fehler beim Löschen.");
      }
    } catch (err) {
      alert("Fehler beim Löschen.");
    }
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
        console.log("DEBUG: Token-Daten", tokenData);
        const currentUserId = tokenData.user._id;
        console.log("DEBUG: Aktuelle UserID", currentUserId);
    
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
        setCurrentUserIsAdmin(data.user.isAdmin || false);
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
          if (field === "priority") setPriority(value);
          if (field === "startDate") {
            setStartDate(value);
          }
          if (field === "endDate") setEndDate(value);
        })
        .catch((err) => console.error("Fehler beim Aktualisieren des Tasks:", err));
      }
  };

const [idToUsernameMap, setIdToUsernameMap] = useState({});

useEffect(() => {
  const map = {};
  userSuggestions.forEach(u => {
    map[u.id] = u.username;
  });
  setIdToUsernameMap(map);
}, [userSuggestions]);

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
          Promise.all(
            data.project.members.map(member => {
              console.log("members:", data.project.members);
              console.log("member:", member);
              // Fix: _id kann ein Objekt sein (MongoDB Export)
                const memberId = typeof member._id === "object" && member._id.$oid
                ? member._id.$oid
                : member._id || member.id;
              console.log("memberId:", memberId);
              return fetch(`${apiUrl}/users/${memberId}`, {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": localStorage.getItem("token"),
                },
              }).then(res => res.json());
            })
          )
          .then(usersData =>{
            console.log("usersData:", usersData);
            setUsers(usersData.map(userData => ({
              value: userData.user._id,
              label: `${userData.user.firstname} ${userData.user.lastname} (${userData.user.username})`
            })));
            setUserSuggestions(
              usersData.map(u => ({
                id: u.user._id,           // bleibt für die interne Referenz
                display: u.user.username, // wird im Text nach Auswahl verwendet
                firstname: u.user.firstname,
                lastname: u.user.lastname,
                username: u.user.username
              }))
            );
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
          project.members.map(async (member) => {
            const memberId = typeof member._id === "object" && member._id.$oid
            ? member._id.$oid
            : member._id || member.id;
            const response = await fetch(`${apiUrl}/users/${memberId}`, {
              method: "GET",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `${token}`
              }
            });
            return response.json();
          })
        );
        console.log("memberDetails:", JSON.stringify(memberDetails.map(user => user.user), null, 2));
        setAssignedUsers(
          memberDetails
            .map(u => ({
              value:
                  typeof u.user._id === "object" && u.user._id.$oid
                    ? u.user._id.$oid
                    : u.user._id || u.user.id,
                label: `${u.user.firstname || ""} ${u.user.lastname || ""} (${u.user.username || u.user.email || (typeof u.user._id === "object" && u.user._id.$oid) || u.user._id || u.user.id})`
              }))
            );
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


  const handleAttachmentUpload = async (e) => {
    e.preventDefault();
    const fileInput = e.target.elements.attachmentFile;
    if (!fileInput.files.length) return;
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    try {
      const res = await fetch(`${apiUrl}/tasks/${task._id}/upload`, {
        method: "POST",
        headers: {
          "Authorization": token,
        },
        body: formData,
      });
      const data = await res.json();
      if (data.status === "success") {
        // Fallback falls data.attachment fehlt
        const newAttachment = data.attachment
          ? data.attachment
          : { fileId: data.fileId, filename: fileInput.files[0].name };
        setAttachments((prev) => [...prev, newAttachment]);
        fileInput.value = "";
      } else {
        alert(data.message || "Fehler beim Hochladen.");
      }
    } catch (err) {
      alert("Fehler beim Hochladen.");
    }
  };

  // Funktion für Attachment-Download mit Auth-Header
  const handleDownloadAttachment = async (att) => {
    try {
      const res = await fetch(`${apiUrl}/attachments/${att.fileId}`, {
        method: "GET",
        headers: { "Authorization": token }
      });
      if (!res.ok) throw new Error("Download fehlgeschlagen");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = att.filename || "attachment";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Fehler beim Download.");
    }
  };

  // Funktion für Attachment-Vorschau
  const handlePreviewAttachment = async (att) => {
    try {
      const res = await fetch(`${apiUrl}/attachments/${att.fileId}/view`, {
        method: "GET",
        headers: { "Authorization": token }
      });
      if (!res.ok) throw new Error("Vorschau fehlgeschlagen");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      // Optional: Nach kurzer Zeit wieder freigeben
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (err) {
      alert("Fehler bei der Vorschau.");
    }
  };

  // Funktion für Attachment-Löschen
  const handleDeleteAttachment = async (att) => {
    if (!window.confirm(t("confirm_delete_attachment") || "Anhang wirklich löschen?")) return;
    try {
      const res = await fetch(`${apiUrl}/tasks/${task._id}/attachments/${att.fileId}`, {
        method: "DELETE",
        headers: { "Authorization": token },
      });
      const data = await res.json();
      if (data.status === "success") {
        setAttachments((prev) => prev.filter(a => a.fileId !== att.fileId));
      } else {
        alert(data.message || "Fehler beim Löschen.");
      }
    } catch (err) {
      alert("Fehler beim Löschen.");
    }
  };

  const [commentTab, setCommentTab] = useState("all"); // "all" | "comments" | "timetracking"

  // Hilfsfunktion: gemischte Liste für "Alle"
  const mergedEntries = useMemo(() => {
    const all = [
      ...comments.map(c => ({ ...c, _type: "comment", createdAt: c.createdAt })),
      ...timeEntries.map(t => ({ ...t, _type: "timetracking", createdAt: t.startTime || t.createdAt })),
    ];
    return all.sort((a, b) =>
      commentSortOrder === "desc"
        ? new Date(b.createdAt) - new Date(a.createdAt)
        : new Date(a.createdAt) - new Date(b.createdAt)
    );
  }, [comments, timeEntries, commentSortOrder]);

  const renderEntry = (entry) => {
    if (entry._type === "comment") {
      return (
        <li key={"c_" + entry._id} className="comment-item comment-entry">
          <div className="entry-header">
        <div className="entry-label-wrapper">
          <span className={`entry-label ${entry._type === "comment" ? "comment-label" : "timetracking-label"}`}>
            {entry._type === "comment" ? <>💬 {t("comment")}</> : <>⏱️ {t("time_tracking") || "Zeiterfassung"}</>}
          </span>
        </div>
        <div className="entry-header-content">
          <div className="entry-title" style={{fontWeight: "normal"}}>
            <ReactMarkdown components={markdownComponents}>
              {(entry.commentText || "").replace(/\n/g, "  \n")}
            </ReactMarkdown>
          </div>
          <div className="entry-user">{entry.createdByFirstname} {entry.createdByLastname} <span className="entry-username">({entry.createdByUsername})</span></div>
          <div className="entry-date">{new Date(entry.createdAt).toLocaleString()}</div>
        </div>
        {(currentUserIsAdmin || entry.createdByUserId === currentUserUserId) && (
          <button
            className="button-small button-red"
            onClick={() => handleDeleteComment(entry._id)}
            title={t("delete_comment")}
          >
            <TrashIcon />
          </button>
        )}
          </div>
        </li>
      );
    }
    if (entry._type === "timetracking") {
      return (
        <li key={"t_" + entry._id} className="comment-item timetracking-entry">
          <div className="entry-header">
        <div className="entry-label-wrapper">
          <span className={`entry-label ${entry._type === "comment" ? "comment-label" : "timetracking-label"}`}>
            {entry._type === "comment"
          ? <>💬 {t("comment")}</>
          : <>⏱️ {t("time_tracking") || "Zeiterfassung"}</>}
          </span>
        </div>
        <div className="entry-header-content">
          <div className="entry-title">
            {entry.startTime && entry.endTime
          ? (() => {
              const diff = Math.floor((new Date(entry.endTime) - new Date(entry.startTime)) / 1000);
              const h = String(Math.floor(diff / 3600)).padStart(2, "0");
              const m = String(Math.floor((diff % 3600) / 60)).padStart(2, "0");
              const s = String(diff % 60).padStart(2, "0");
              return `${h}:${m}:${s}`;
            })()
          : ""}
            {entry.description && <> – {entry.description}</>}
          </div>
          <div className="entry-user">
            {entry.createdByFirstname} {entry.createdByLastname} <span className="entry-username">({entry.createdByUsername})</span>
          </div>
          <div className="entry-date">
            {entry.startTime ? new Date(entry.startTime).toLocaleString() : ""}
            {entry.endTime ? " – " + new Date(entry.endTime).toLocaleString() : ""}
          </div>
        </div>
        {(currentUserIsAdmin || entry.userId === currentUserUserId) && (
          <button
            className="button-small button-red"
            onClick={() => deleteTimeEntry(entry._id)}
            title={t("delete_time_entry")}
          >
            <TrashIcon />
          </button>
        )}
          </div>
        </li>
      );
    }
    return null;
  };


  // Mapping username -> {firstname, lastname, username}
  const usernameMap = useMemo(() => {
    const map = {};
    userSuggestions.forEach(u => {
      map[u.username] = u;
    });
    return map;
  }, [userSuggestions]);

  // Hilfsfunktion: Erwähnungen ersetzen
  function renderMentions(text) {
    return text.split(/(@[a-zA-Z0-9_.-]+)/g).map((part, i) => {
      if (part.startsWith("@")) {
        const username = part.slice(1);
        const user = usernameMap[username];
        if (user) {
          return (
            <Link
              key={user._id}
              to={`/user/${user.username}`}
              className="mention-badge"
              style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}
            >
              {user.firstname} {user.lastname} ({user.username})
            </Link>
          );
        }
      }
      return part;
    });
  }

  // Markdown-Komponenten für angepasste Schriftgrößen und Erwähnungen
  const markdownComponents = {
    h1: ({node, ...props}) => <h1 style={{fontSize: "1.5em", margin: "0.5em 0"}} {...props} />,
    h2: ({node, ...props}) => <h2 style={{fontSize: "1.3em", margin: "0.5em 0"}} {...props} />,
    h3: ({node, ...props}) => <h3 style={{fontSize: "1.1em", margin: "0.5em 0"}} {...props} />,
    h4: ({node, ...props}) => <h4 style={{fontSize: "1em", margin: "0.5em 0"}} {...props} />,
    h5: ({node, ...props}) => <h5 style={{fontSize: "0.95em", margin: "0.5em 0"}} {...props} />,
    h6: ({node, ...props}) => <h6 style={{fontSize: "0.9em", margin: "0.5em 0"}} {...props} />,
    p: ({node, ...props}) => (
      <p style={{margin: "0.3em 0"}}>
        {typeof props.children === "string"
          ? renderMentions(props.children)
          : React.Children.map(props.children, child =>
              typeof child === "string" ? renderMentions(child) : child
            )
        }
      </p>
    ),
    li: ({node, ...props}) => <li style={{margin: "0.2em 0"}} {...props} />,
    code: ({node, ...props}) => <code style={{background: "#222", color: "#fff", padding: "2px 4px", borderRadius: "3px"}} {...props} />,
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button onClick={onClose} className="modal-close">✕</button>
          {editMode && (
            <button
              onClick={handleDeleteTask}
              className="button-red"
              style={{ marginLeft: 8 }}
            >
              {t("delete_task")}
            </button>
          )}
        </div>
        <div className="modal-column" style={{ gap: "0px" }}>
          {editMode ? (
            <input
              type="text"
              className="modal-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => updateTask("title", title)}
            />
          ) : (
            <>
              <h2 style={{ margin: "0px"}}>{title}</h2>
              <p style={{ color: "#888", fontSize: "0.95em", margin: "0px" }}>
                #{task.ticketNumber}
              </p>
            </>
          )}
        </div>
        {error && <p className="error-message">{error}</p>}

        <div className="modal-form">
          <div className="modal-row">
            <div className="modal-column">
              <div style={{ marginBottom: 10 }}>
                <button
                  className="button-violet"
                  onClick={() => setShowTimeTracking((v) => !v)}
                  style={{ marginBottom: 4 }}
                >
                  {showTimeTracking ? t("hide_time_tracking") || "Zeiterfassung ausblenden" : t("show_time_tracking") || "Zeiterfassung anzeigen"}
                </button>
                <Collapse isOpened={showTimeTracking}>
                  <div className="modal-timetracking" style={{ marginBottom: 16 }}>
                    <h3>{t("time_tracking") || "Zeiterfassung"}</h3>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
                      <input
                        type="text"
                        className="modal-input"
                        style={{ width: 110, fontFamily: "monospace" }}
                        value={manualDuration}
                        onChange={e => setManualDuration(e.target.value.replace(/[^0-9:]/g, ""))}
                        disabled={tracking}
                        placeholder="hh:mm:ss"
                      />
                      <input
                        type="text"
                        className="modal-input"
                        style={{ width: 220 }}
                        value={timeTrackingDescription}
                        onChange={e => setTimeTrackingDescription(e.target.value)}
                        placeholder={t("timetracking_description") || "Beschreibung (optional)"}
                      />
                      {!tracking ? (
                        <button className="button-violet" onClick={startTracking}>
                          {t("start_timer") || "Timer starten"}
                        </button>
                      ) : (
                        <>
                          <button className="button-red" onClick={stopTracking}>
                            {t("stop_timer") || "Timer stoppen"}
                          </button>
                        </>
                      )}
                      <button
                        className="button-violet"
                        onClick={saveTracking}
                        disabled={tracking ? false : manualDuration === "00:00:00"}
                        style={{ marginLeft: 8 }}
                      >
                        {t("save_time_entry") || "Zeiteintrag speichern"}
                      </button>
                    </div>
                  </div>
                </Collapse>
              </div>
            </div>
          </div>
          <div className="modal-row">
            <div className="modal-column">
              <label>{t("description")}:</label>
              {editMode ? (
                userSuggestions.length > 0 ? (
                  <MentionsInput
                    value={description || ""}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t("description")}
                    className="mentions__input"
                  >
                    <Mention
                      trigger="@"
                      data={userSuggestions}
                      markup="@__display__" // intern wird die DB-ID gespeichert
                      appendSpaceOnAdd={true}
                      displayTransform={(id, display) => `@${display}`} // ← display = username!
                      renderSuggestion={(entry, search, highlightedDisplay, index, focused) => (
                        <div className={`mentions__input__suggestions__item${focused ? " mentions__input__suggestions__item--focused" : ""}`}>
                          {entry.firstname} {entry.lastname} <span style={{ color: "#888" }}>({entry.username})</span>
                        </div>
                      )}
                    />
                  </MentionsInput>
                ) : (
                  <textarea
                    className="modal-input"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t("description")}
                    style={{ minHeight: 60, width: "100%" }}
                  />
                )
              ) : (
                <div style={{fontWeight: "normal"}}>
                  <ReactMarkdown components={markdownComponents}>
                    {(description || "").replace(/\n/g, "  \n")}
                  </ReactMarkdown>
                </div>
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
                  value={priorities.find(p => p.name === priority.name) ? { value: priority.name, label: priority.name } : null}
                  placeholder={priority}
                  onChange={(option) => {
                    setPriority({ name: option.value });
                    updateTask("priority", option.value);
                  }}
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
                  options={users.map(user => ({
                    value: user.value || user._id,
                    label: user.label || `${user.firstname} ${user.lastname} (${user.username})`
                  }))}
                  value={assignedUsers.map(user => ({
                    value: user._id || user.value,
                    label: user.label || `${user.firstname} ${user.lastname} (${user.username})`
                  }))}
                  onChange={updateTaskMembers}
                  placeholder={t("choose_assigned_users")}
                  isDisabled={!editMode}
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

        {/* Kommentare */}
        <div className="modal-comments">
          <h3>{t("comments")}</h3>
          {/* Tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <button
              className={commentTab === "all" ? "button-violet" : "button-small"}
              onClick={() => setCommentTab("all")}
            >
              {t("all")}
            </button>
            <button
              className={commentTab === "comments" ? "button-violet" : "button-small"}
              onClick={() => setCommentTab("comments")}
            >
              {t("comments")}
            </button>
            <button
              className={commentTab === "timetracking" ? "button-violet" : "button-small"}
              onClick={() => setCommentTab("timetracking")}
            >
              {t("time_tracking")}
            </button>
          </div>
          {/* Kommentar hinzufügen bleibt wie gehabt */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
            <div className="add-comment-row">
              {userSuggestions.length > 0 ? (
                  <MentionsInput
                    value={newComment || ""}
                    onChange={(event, newValue) => setNewComment(newValue)}
                    className="mentions__input"
                    placeholder={t("add_comment")}
                  >
                    <Mention
                      trigger="@"
                      data={userSuggestions}
                      markup="@__display__" // intern wird die DB-ID gespeichert
                      appendSpaceOnAdd={true}
                      displayTransform={(id, display) => `@${display}`} // ← display = username!
                      renderSuggestion={(entry, search, highlightedDisplay, index, focused) => (
                      <div className={`mentions__input__suggestions__item${focused ? " mentions__input__suggestions__item--focused" : ""}`}>
                        {entry.firstname} {entry.lastname} <span style={{ color: "#888" }}>({entry.username})</span>
                      </div>
                      )}
                    />
                  </MentionsInput>
                    ) : (
                    <textarea
                      className="modal-input"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder={t("add_comment")}
                      style={{ minHeight: 60, width: "100%" }}
                    />
                    )}
                    <div style={{display: "flex", gap: "10px", justifyContent: "space-between", alignItems: "space-between"}}>
                    <button className="button-violet" onClick={handleAddComment}>
                      {t("add_comment")}
                    </button>
                    <button
                      className="button-small"
                      onClick={() => setCommentSortOrder(order => order === "desc" ? "asc" : "desc")}
                      style={{ minWidth: 120 }}
                      >
                      {commentSortOrder === "desc"
                      ? t("sort_oldest_first") || "Älteste zuerst"
                      : t("sort_newest_first") || "Neueste zuerst"}
                    </button>
                    </div>
                  </div>
                  </div>
                  {/* Einträge je nach Tab */}
          {commentTab === "all" && (
            <ul className="comment-list">
              {mergedEntries.length === 0 ? (
                <li className="comment-item">{t("no_comments_found")}</li>
              ) : (
                mergedEntries.map(renderEntry)
              )}
            </ul>
          )}
          {commentTab === "comments" && (
            <ul className="comment-list">
              {comments.length === 0 ? (
                <li className="comment-item">{t("no_comments_found")}</li>
              ) : (
                comments.map(c => renderEntry({ ...c, _type: "comment" }))
              )}
            </ul>
          )}
          {commentTab === "timetracking" && (
            <ul className="comment-list">
              {timeEntries.length === 0 ? (
                <li className="comment-item">{t("no_time_entries_found") || "Keine Zeiterfassungen gefunden."}</li>
              ) : (
                [...timeEntries]
                  .sort((a, b) =>
                    commentSortOrder === "desc"
                      ? new Date(b.startTime || b.createdAt) - new Date(a.startTime || a.createdAt)
                      : new Date(a.startTime || a.createdAt) - new Date(b.startTime || b.createdAt)
                  )
                  .map(t => renderEntry({ ...t, _type: "timetracking" }))
              )}
            </ul>
          )}
        </div>

        {/* Anhänge */}
        <div className="modal-attachments">
          <h3>{t("attachments")}</h3>
          {editMode && (
            <form onSubmit={handleAttachmentUpload} className="attachment-upload-form">
              <input type="file" name="attachmentFile" />
              <button type="submit" className="button-small button-violet" style={{ marginLeft: 8 }}>
                {t("upload") || "Hochladen"}
              </button>
            </form>
          )}
          {attachments.length === 0 ? (
            <p>{t("no_attachments_found")}</p>
          ) : (
            <ul className="attachment-list">
              {attachments.map((att) => (
                <li key={att.fileId} className="attachment-item">
                  <div className="attachment-info">
                    <span className="attachment-icon">📎</span>
                    <span className="attachment-filename">{att.filename}</span>
                  </div>
                  <div className="attachment-actions">
                    <button
                      className="button-small button-violet"
                      title={t("preview")}
                      onClick={e => {
                        e.preventDefault();
                        handlePreviewAttachment(att);
                      }}
                    >
                      {t("preview") || "Ansehen"}
                    </button>
                    <button
                      className="button-small"
                      title={t("download")}
                      onClick={e => {
                        e.preventDefault();
                        handleDownloadAttachment(att);
                      }}
                    >
                      ⬇️
                    </button>
                    {editMode && (
                      <button
                        className="button-small button-red"
                        title={t("delete")}
                        onClick={() => handleDeleteAttachment(att)}
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="modal-actions">
          <button onClick={() => setEditMode(!editMode)} className="button-violet">
            {editMode ? t("finish") : t("edit")}
          </button>
          <button onClick={onClose} className="button-red">{t("close")}</button>
        </div>
      </div>
    </div>
  );
};

const TrashIcon = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    style={{ display: "inline", verticalAlign: "middle" }}
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="5" y="7" width="10" height="8" rx="2" />
    <rect x="8" y="3" width="4" height="2" rx="1" />
    <rect x="3" y="5" width="14" height="2" rx="1" />
  </svg>
);

export default TaskViewModal;
