import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Select from "react-select";
import { useTranslation } from "react-i18next";
import ProgressBar from "@ramonak/react-progress-bar";
import no from '../functions/no.js'
import { Doughnut } from "react-chartjs-2";
import { Chart, ArcElement, Tooltip, Legend } from "chart.js";
Chart.register(ArcElement, Tooltip, Legend);

import TaskListView from "../components/TaskListView";
import TaskGridView from "../components/TaskGridView";
import TaskKanbanView from "../components/TaskKanbanView";
import TaskGanttView from "../components/TaskGanttView";
import TaskCreateModal from "../components/TaskCreateModal";
import TaskViewModal from "../components/TaskViewModal";
import config from "../config/config.json";
import ProjectOverview from "../components/ProjectOverview";

const apiUrl = import.meta.env.VITE_APP_API_URL || "http://localhost:3001";

const customFieldTypeOptions = [
  { value: "checkbox", label: "Checkbox" },
  { value: "color", label: "Color" },
  { value: "date", label: "Date" },
  { value: "datetime-local", label: "Datetime Local" },
  { value: "time", label: "Time" },
  { value: "email", label: "Email" },
  { value: "number", label: "Number" },
  { value: "password", label: "Password" },
  { value: "tel", label: "Tel" },
  { value: "text", label: "Text" },
  { value: "url", label: "URL" },
  { value: "dropdown", label: "Dropdown" }
];

const ProjectView = () => {
  const location = useLocation();
  const projectId = location.pathname.split("/").pop();
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskViewModal, setShowTaskViewModal] = useState(false);
  const [showTaskCreateModal, setShowTaskCreateModal] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [accessDenied, setAccessDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState(null);
  const [users, setUsers] = useState([]);
  const token = localStorage.getItem("token");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const { t, i18n } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingCustomFields, setIsEditingCustomFields] = useState(false);
  const [editProject, setEditProject] = useState(project);
  const [errorMessage, setErrorMessage] = useState("");
  const [projectStatuses, setProjectStatuses] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("");
  const [required, setRequired] = useState(false);
  const [loadingCustomFields, setLoadingCustomFields] = useState(true);
  const [editingFieldId, setEditingFieldId] = useState(null);
  const [editingFieldTitle, setEditingFieldTitle] = useState("");
  const [editingFieldType, setEditingFieldType] = useState("");
  const [editingFieldRequired, setEditingFieldRequired] = useState(false);
  const [dropdownValues, setDropdownValues] = useState([""]); // State für Dropdown-Werte

  
  useEffect(() => {
    fetchMail2TicketDetails()
  }, []);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(`${apiUrl}/users`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `${token}`
          }
        });
        const data = await response.json();
        setUsers(data.users.map(user => ({ value: user._id, label: `${user.firstname} ${user.lastname} (${user.username})`})));
      } catch (error) {
        console.error("Fehler beim Laden der Benutzer", error);
      }
    };
    fetchUsers();
  }, [token]);

  
  useEffect(() => {
    const fetchProject = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const response = await fetch(`${apiUrl}/projects/${projectId}`, {
          headers: { "Authorization": token }
        });
        if (response.status === 403) {
          setAccessDenied(true);
          setProject(null);
        } else {
          const data = await response.json();
          setProject(data.project);
          setEditProject(data.project);
          setSelectedMembers(data.project.members.map(member => ({ value: member._id, label: `${member.firstname} ${member.lastname} (${member.username})` })));
          setAccessDenied(false);
        }
      } catch (error) {
        setAccessDenied(true);
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [projectId, token]);

  useEffect(() => {
    getTasks(projectId, token)
  }, [projectId, token]);

  useEffect(() => {
    const fetchProjectStatuses = async () => {
      try {
        const response = await fetch(`${apiUrl}/config/projectStatuses`, {
          method: "GET",
          headers: { "Content-Type": "application/json", "Authorization": token }
        });
        const data = await response.json();
        setProjectStatuses(data.map(status => ({ value: status._id, label: status.name, isDone: status.isDone })));
      } catch (error) {
        console.error("Fehler beim Laden der Projektstatus", error);
      }
    };
    fetchProjectStatuses()
  }, [projectId, token]);




  const getTasks = async (projectId, token) => {
      try {
        const response = await fetch(`${apiUrl}/projects/${projectId}/tasks`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `${token}`
          }
        });
        const data = await response.json();
        console.log(data)
        setTasks(data.tasks);
      } catch (error) {
        console.error("Fehler beim Laden der Tasks", error);
      }
    };

  const openTaskViewModal = (task) => {
    console.log(task)
    setSelectedTask(task);
    setShowTaskViewModal(true);
  };

  const closeTaskViewModal = () => {
    setShowTaskViewModal(false);
    getTasks(projectId, token)
    setSelectedTask(null);
  };

  const openTaskCreateModal = () => {
      setShowTaskCreateModal(true);
  };

  const closeTaskCreateModal = () => {
      setShowTaskCreateModal(false);
      getTasks(projectId, token)
  };


  const updateProjectDetails = async () => {
  try {
    // EASTEREGG
    if (localStorage.easterEggMode == "true" && (!editProject.title || editProject.title == "" || editProject.title == undefined)) {
      no()
      setErrorMessage(t("error_title_required"))
      return;
    }
    else if (!localStorage.easterEggMode && (!editProject.title || editProject.title == "" || editProject.title == undefined)){
      setErrorMessage(t("error_title_required"))
      return;
    }
    // NEU: Beschreibung prüfen
    if (!editProject.description || editProject.description.trim() === "") {
      setErrorMessage(t("error_description_required"));
      return;
    }

    // Standardstatus setzen, falls keiner ausgewählt und Statusliste vorhanden
    let selectedStatus = projectStatuses.find(status => status.label === editProject.status);
    if (!selectedStatus && projectStatuses.length > 0) {
      selectedStatus = projectStatuses[0]; // Ersten Status als Fallback nehmen
    }

    // Wenn keine Status vorhanden, Status auf "offen" oder "open" setzen
    let statusValue = selectedStatus ? selectedStatus.label : "offen";

    const projectIsDone = selectedStatus?.isDone || false;

    const response = await fetch(`${apiUrl}/projects/${projectId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Authorization": `${token}` },
      body: JSON.stringify({
        title: editProject.title,
        description: editProject.description,
        deadline: editProject.deadline,
        members: selectedMembers.map(member => member.value),
        isServiceDesk: editProject.isServiceDesk,
        isDone: projectIsDone,
        status: editProject.status, // jetzt die ID!
      })
    });
    const data = await response.json();
    if (data.status === "success") {
      setProject(data.project);
      setIsEditing(false);
  
      if ((project.isServiceDesk !== editProject.isServiceDesk) && (editProject.isServiceDesk == true)) {
        await fetch(`${apiUrl}/mail2ticket`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `${token}` },
          body: JSON.stringify({
            projects: [data.project._id],
            imapHost: editProject.imapHost,
            imapPort: editProject.imapPort,
            imapUser: editProject.imapUser,
            imapPassword: editProject.imapPassword,
            emailAddress: editProject.emailAddress,
            checkPeriodInMinutes: editProject.checkPeriodInMinutes,
            smtpHost: editProject.smtpHost,
            smtpPort: editProject.smtpPort,
            smtpUser: editProject.smtpUser,
            smtpPassword: editProject.smtpPassword,
            smtpSecure: editProject.smtpSecure
          })
        });
      }
      else if ((project.isServiceDesk == editProject.isServiceDesk) && (editProject.isServiceDesk == true)) {
        await fetch(`${apiUrl}/mail2ticket/${project.mail2ticketConnectorId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "Authorization": `${token}` },
          body: JSON.stringify({
            projects: [data.project._id],
            imapHost: editProject.imapHost,
            imapPort: editProject.imapPort,
            imapUser: editProject.imapUser,
            imapPassword: editProject.imapPassword,
            emailAddress: editProject.emailAddress,
            checkPeriodInMinutes: editProject.checkPeriodInMinutes,
            smtpHost: editProject.smtpHost,
            smtpPort: editProject.smtpPort,
            smtpUser: editProject.smtpUser,
            smtpPassword: editProject.smtpPassword,
            smtpSecure: editProject.smtpSecure
          })
        });
      }
      else if (project.isServiceDesk == true && editProject.isServiceDesk == false) {
        await fetch(`${apiUrl}/mail2ticket/${project.mail2ticketConnectorId}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json", "Authorization": `${token}` },
        });
      }
    } else {
      console.error("Fehler beim Aktualisieren des Projekts", data.message);
    }

  } catch (error) {
    console.error("Fehler beim Aktualisieren des Projekts", error);
  }
  };
  

  const fetchMail2TicketDetails = async () => {
    try {
      const response = await fetch(`${apiUrl}/mail2ticket/byProjectId/${projectId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json", "Authorization": `${token}` }
      });

      const data = await response.json();
      if (data.status === "success" && data.connectors.length > 0) {
        const connector = data.connectors[0]; // Falls mehrere, nehme den ersten
        setEditProject(prev => ({
          ...prev,
          mail2ticketConnectorId: connector._id || "",
          imapHost: connector.imapHost || "",
          imapPort: connector.imapPort || "",
          imapUser: connector.imapUser || "",
          imapPassword: connector.imapPassword || "",
          emailAddress: connector.emailAddress || "",
          checkPeriodInMinutes: connector.checkPeriodInMinutes || "",
          smtpHost: connector.smtpHost || "",
          smtpPort: connector.smtpPort || "",
          smtpUser: connector.smtpUser || "",
          smtpPassword: connector.smtpPassword || "",
          smtpSecure: connector.smtpSecure || false
        }));
        setProject(prev => ({
          ...prev,
          mail2ticketConnectorId: connector._id || "",
          imapHost: connector.imapHost || "",
          imapPort: connector.imapPort || "",
          imapUser: connector.imapUser || "",
          imapPassword: connector.imapPassword || "",
          emailAddress: connector.emailAddress || "",
          checkPeriodInMinutes: connector.checkPeriodInMinutes || "",
          smtpHost: connector.smtpHost || "",
          smtpPort: connector.smtpPort || "",
          smtpUser: connector.smtpUser || "",
          smtpPassword: connector.smtpPassword || "",
          smtpSecure: connector.smtpSecure || false
        }));
      }
    } catch (error) {
      console.error("Fehler beim Abrufen der Mail2Ticket-Daten", error);
    }
  };

  const startEditing = async () => {
    if (editProject.isServiceDesk) {
      await fetchMail2TicketDetails();
    }
    await setIsEditing(true);
  };

  const stopEditing = async () => {
    setIsEditing(false);
  };

   // Bestehende Custom Fields für das Projekt laden
   useEffect(() => {
    const fetchCustomFields = async () => {
      try {
        const response = await fetch(`${apiUrl}/customFields/tasks?projectId=${projectId}`, {
          method: "GET",
          headers: { "Content-Type": "application/json", "Authorization": `${token}` }
        });
        const data = await response.json();
        if (data.status === "success") {
          setCustomFields(data.taskCustomFields);
        }
      } catch (error) {
        console.error("Fehler beim Laden der Custom Fields", error);
      } finally {
        setLoadingCustomFields(false);
      }
    };

    fetchCustomFields();
  }, [projectId]);


  // Formular zum Erstellen eines neuen Custom Field absenden
  const handleCustomFieldSubmit = async (e) => {
    e.preventDefault();
    try {
      const fieldData = { projectId, title, type, required };
      if (type === "dropdown") {
        fieldData.options = dropdownValues.filter(v => v.trim() !== "");
      }

      const response = await fetch(`${apiUrl}/customFields/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `${token}` },
        body: JSON.stringify(fieldData)
      });

      const data = await response.json();

      if (data.status === "success") {
        // Neuen Eintrag zur Liste hinzufügen und Formular zurücksetzen
        setCustomFields([...customFields, data.taskCustomField]);
        setTitle("");
        setType("text");
        setRequired(false);
        setDropdownValues([""]);
      } else {
        console.error("Fehler beim Erstellen des Custom Fields:", data.message);
      }
    } catch (error) {
      console.error("Fehler beim Erstellen des Custom Fields", error);
    }
  };


  const handleDeleteCustomField = async (id) => {
    if(!window.confirm(t("confirm_delete_custom_field"))) return;  // Optional: Bestätigung einholen
    try {
      const response = await fetch(`${apiUrl}/customFields/tasks/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", "Authorization": `${token}` }
      });
      const data = await response.json();
      if(data.status === "success") {
        setCustomFields(customFields.filter(field => field._id !== id));
      } else {
        console.error("Fehler beim Löschen des Custom Fields:", data.message);
      }
    } catch (error) {
      console.error("Fehler beim Löschen des Custom Fields:", error);
    }
  };

  const handleStartEditCustomField = (field) => {
    setEditingFieldId(field._id);
    setEditingFieldTitle(field.title);
    setEditingFieldType(field.type);
    setEditingFieldRequired(field.required);
  };

  const handleSaveEditCustomField = async () => {
    try {
      const response = await fetch(`${apiUrl}/customFields/tasks/${editingFieldId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `${token}` },
        body: JSON.stringify({ title: editingFieldTitle, type: editingFieldType, required: editingFieldRequired })
      });
      const data = await response.json();
      if (data.status === "success") {
        setCustomFields(customFields.map(field => field._id === editingFieldId ? data.taskCustomField : field));
        setEditingFieldId(null);
        setEditingFieldTitle("");
        setEditingFieldType("");
        setEditingFieldRequired(false);
      } else {
        console.error("Fehler beim Aktualisieren des Custom Fields:", data.message);
      }
    } catch (error) {
      console.error("Fehler beim Aktualisieren des Custom Fields:", error);
    }
  };

  const handleCancelEditCustomField = () => {
    setEditingFieldId(null);
    setEditingFieldTitle("");
    setEditingFieldType("");
    setEditingFieldRequired(false);
  };
  
  if (loading) return <div>{t("loading_project")}</div>;
  if (accessDenied) return <div style={{color:"red"}}>{t("no_access_to_project") || "Kein Zugriff auf dieses Projekt."}</div>;

  return (
    <div className="project-view-container">
    <div className="tabs">
      <button onClick={() => setActiveTab("overview")}>{t("project_overview")}</button>
      <button onClick={() => setActiveTab("list")}>{t("task_list")}</button>
      <button onClick={() => setActiveTab("grid")}>{t("task_grid")}</button>
      <button onClick={() => setActiveTab("kanban")}>{t("kanban")}</button>
      <button onClick={() => setActiveTab("gantt")}>{t("gantt_diagram")}</button>
      <button className="button-violet" onClick={() => openTaskCreateModal(null)}>+ {t("add_task")}</button>
    </div>

    <div className="tab-content">
      {activeTab === "overview" && project && (
        <div className="project-overview-grid">
          {/* Hauptinfos */}
          <div className="project-card project-main-info">
            {isEditing ? (
              <>
                <span className="error-message">{errorMessage}</span>
                <input className="input" type="text" value={editProject.title} onChange={(e) => setEditProject({ ...editProject, title: e.target.value })} placeholder={t("title")} />
                <textarea className="input" value={editProject.description} onChange={(e) => setEditProject({ ...editProject, description: e.target.value })} placeholder={t("description")} />
                <input className="input" type="datetime-local" value={editProject.deadline} onChange={(e) => setEditProject({ ...editProject, deadline: e.target.value })} />
                <Select isMulti options={users} value={selectedMembers} onChange={setSelectedMembers} placeholder={t("choose_assigned_users")} />
                <Select
                  options={projectStatuses}
                  value={projectStatuses.find(status => status.value === editProject.status)}
                  onChange={(option) => setEditProject({ ...editProject, status: option.value })} />
                <label className="checkbox-label">
                  <input type="checkbox" checked={editProject.isServiceDesk} onChange={(e) => setEditProject({ ...editProject, isServiceDesk: e.target.checked })} /> {t("is_servicedesk")}
                </label>
                {editProject.isServiceDesk && (
                  <div className="modal-mail2ticket-fields-container">
                    <div className="modal-mail2ticket-fields-group">
                      <input 
                        type="text" 
                        placeholder="IMAP Host" 
                        value={editProject.imapHost || ""} 
                        onChange={(e) => setEditProject({...editProject, imapHost: e.target.value})} 
                      />
                      <input 
                        type="text" 
                        placeholder="IMAP Port" 
                        value={editProject.imapPort || ""} 
                        onChange={(e) => setEditProject({...editProject, imapPort: e.target.value})} 
                      />
                    </div>

                    <div className="modal-mail2ticket-fields-group">
                      <input 
                        type="text" 
                        placeholder="IMAP User" 
                        value={editProject.imapUser || ""} 
                        onChange={(e) => setEditProject({...editProject, imapUser: e.target.value})} 
                      />
                      <input 
                        type="password" 
                        placeholder="IMAP Password" 
                        value={editProject.imapPassword || ""} 
                        onChange={(e) => setEditProject({...editProject, imapPassword: e.target.value})} 
                      />
                    </div>

                    <div className="modal-mail2ticket-fields-group">
                      <input 
                        type="email" 
                        placeholder="Email Address" 
                        value={editProject.emailAddress || ""} 
                        onChange={(e) => setEditProject({...editProject, emailAddress: e.target.value})} 
                      />
                      <input 
                        type="number" 
                        placeholder="Check Period (minutes)" 
                        value={editProject.checkPeriodInMinutes || ""} 
                        onChange={(e) => setEditProject({...editProject, checkPeriodInMinutes: e.target.value})} 
                      />
                    </div>

                    <div className="modal-mail2ticket-fields-group">
                      <input 
                        type="text" 
                        placeholder="SMTP Host" 
                        value={editProject.smtpHost || ""} 
                        onChange={(e) => setEditProject({...editProject, smtpHost: e.target.value})} 
                      />
                      <input 
                        type="text" 
                        placeholder="SMTP Port" 
                        value={editProject.smtpPort || ""} 
                        onChange={(e) => setEditProject({...editProject, smtpPort: e.target.value})} 
                      />
                    </div>

                    <div className="modal-mail2ticket-fields-group">                
                      <input 
                        type="text" 
                        placeholder="SMTP User" 
                        value={editProject.smtpUser || ""} 
                        onChange={(e) => setEditProject({...editProject, smtpUser: e.target.value})} 
                      />
                      <input 
                        type="password" 
                        placeholder="SMTP Password" 
                        value={editProject.smtpPassword || ""} 
                        onChange={(e) => setEditProject({...editProject, smtpPassword: e.target.value})} 
                      />
                    </div>  

                    <div className="modal-mail2ticket-fields-group">
                      <label>
                        <input 
                          type="checkbox" 
                          checked={editProject.smtpSecure || false} 
                          onChange={(e) => setEditProject({...editProject, smtpSecure: e.target.checked})} 
                        /> SMTP Secure
                      </label>
                    </div>
                  </div>

                  )}
                  <div className="button-row">
                    <button className="button-primary" onClick={updateProjectDetails}>{t("save")}</button>
                    <button className="button-secondary" onClick={stopEditing}>{t("cancel")}</button>
                  </div>
              </>
            ) : (
              <>
                <h2 className="project-title">{project.title}</h2>
                <p style={{marginTop: 0, color: "var(--body-text)"}}>{project.description}</p>
                <div className="project-meta">
                  <span><strong>{t("status")}:</strong> {projectStatuses.find(status => status.label === project?.status)?.label || t("unknown")}</span>
                  <span><strong>{t("deadline")}:</strong> {new Date(project.deadline).toLocaleString()}</span>
                  <span><strong>{t("is_servicedesk")}:</strong> {project.isServiceDesk ? "☑️" : "❌"}</span>
                </div>
                {/* Mitglieder-Badges */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
                  {t("members")}:{project.members && project.members.map(member => (
                    <span key={member._id} className="user-badge">
                      {member.firstname} {member.lastname} ({member.username})
                    </span>
                  ))}
                </div>
                <div className="button-row">
                  <button className="button-primary" onClick={startEditing}>{t("edit")}</button>
                </div>
              </>
            )}
          </div>
          {/* Statistiken */}
          <div className="project-card">
            <h3>{t("total_tasks")}</h3>
            <div className="project-stat">{tasks.length}</div>
          </div>
          <div className="project-card">
            <h3>{t("open_tasks")}</h3>
            <div className="project-stat">{tasks.filter(task => !task.isDone).length}</div>
            <Doughnut
              data={{
                labels: [t("open_tasks"), t("done_tasks")],
                datasets: [
                  {
                    data: [
                      tasks.filter(task => !task.isDone).length,
                      tasks.filter(task => task.isDone).length
                    ],
                    backgroundColor: ["#ffcc00", "#99ff99"],
                  }
                ]
              }}
              options={{
                plugins: {
                  legend: { display: true, position: "bottom" }
                }
              }}
            />
            {t("done_in_percent")}:
            <ProgressBar className="progress-bar" style={{ alignSelf: "flex-end" }} bgColor="#99ff99" labelColor="#000000" completed={(100 - (100 / tasks.length * tasks.filter(task => !task.isDone).length)).toPrecision(2)} />
          </div>
          {/* Custom Fields */}
          <div className="project-card project-custom-fields">
            <h3>{t("custom_fields_for_tasks")}</h3>
            {loadingCustomFields ? (
              <p>Lädt Custom Fields...</p>
            ) : customFields.length > 0 ? (
              <table>
                {customFields.map((field) => (
                  <tr key={field._id}>
                    {editingFieldId === field._id ? (
                      <>
                        <td>
                        <input 
                            type="text" 
                            value={editingFieldTitle} 
                            onChange={(e) => setEditingFieldTitle(e.target.value)} 
                          />
                        </td>
                        <td>
                          <Select
                            options={customFieldTypeOptions}
                            value={customFieldTypeOptions.find(opt => opt.value === field.type)}
                            onChange={(selectedOption) => setType(selectedOption.value)}
                          />
                          {field.type === "dropdown" && (
                            <div>
                              <h4>{t("dropdown_values")}</h4>
                              {JSON.parse(field.options).map((value, index) => (
                                <div key={index}>
                                  <input
                                    type="text"
                                    value={value}
                                    onChange={(e) => {
                                      const newValues = [...dropdownValues];
                                      newValues[index] = e.target.value;
                                      setDropdownValues(newValues);
                                    }}
                                    placeholder={t("dropdown_option")}
                                  />
                                  <button type="button" onClick={() => setDropdownValues(dropdownValues.filter((_, i) => i !== index))}>-</button>
                                </div>
                              ))}
                              <button type="button" onClick={() => setDropdownValues([...dropdownValues, ""])}>+</button>
                            </div>
                          )}
                        </td>
                        <td>
                          <label>
                            <input 
                              type="checkbox" 
                              checked={editingFieldRequired} 
                              onChange={(e) => setEditingFieldRequired(e.target.checked)} 
                            /> {t("required")}
                        </label>
                        </td>
                        <td>
                          <div style={{"display": "inline-flex", "gap": "5px", "marginLeft": "5px"}}>
                              <button style={{"padding": "5px"}} onClick={handleSaveEditCustomField}>{t("save")}</button>
                              <button style={{"padding": "5px"}} onClick={handleCancelEditCustomField}>{t("cancel")}</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td>
                          <strong>{field.title}</strong> – {field.type} {field.required ? "(" + t("required") + ")" : ""}
                          {isEditingCustomFields && (
                              <div style={{"display": "inline-flex", "gap": "5px", "marginLeft": "5px"}}>
                                <button style={{"padding": "5px"}}  onClick={() => handleStartEditCustomField(field)}>{t("edit")}</button>
                                <button style={{"padding": "5px"}}  onClick={() => handleDeleteCustomField(field._id)}>{t("delete")}</button>
                              </div>
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </table>
            ) : (
              <p>{t("no_custom_fields_available")}</p>
            )}
            
            {isEditingCustomFields && (
              <div>
                <h4>Neues Custom Field erstellen</h4>
                <form onSubmit={handleCustomFieldSubmit} style={{"display": "flex", "flexDirection": "column", "gap": "5px"}}>
                  <div>
                    <input
                      id="customFieldTitle"
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      placeholder={t("title")}
                    />
                  </div>
                  <div>
                    <Select
                      options={customFieldTypeOptions}
                      value={customFieldTypeOptions.find(opt => opt.value === type)}
                      onChange={(selectedOption) => setType(selectedOption.value)}
                    />
                    {type === "dropdown" && (
                      <div>
                        <h4>{t("dropdown_values")}</h4>
                        {dropdownValues.map((value, index) => (
                          <div key={index}>
                            <input
                              type="text"
                              value={value}
                              onChange={(e) => {
                                const newValues = [...dropdownValues];
                                newValues[index] = e.target.value;
                                setDropdownValues(newValues);
                              }}
                              placeholder={t("dropdown_option")}
                            />
                            <button type="button" onClick={() => setDropdownValues(dropdownValues.filter((_, i) => i !== index))}>-</button>
                          </div>
                        ))}
                        <button type="button" onClick={() => setDropdownValues([...dropdownValues, ""])}>+</button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label htmlFor="customFieldRequired">{t("required")}:</label>
                    <input
                      id="customFieldRequired"
                      type="checkbox"
                      checked={required}
                      onChange={(e) => setRequired(e.target.checked)}
                    />
                  </div>
                  <button type="submit">Custom Field erstellen</button>
                </form>
              </div>
            )}
            {isEditingCustomFields ? null : <button onClick={() => setIsEditingCustomFields(true)}>{t("edit")}</button>}
            {!isEditingCustomFields ? null : <button onClick={() => setIsEditingCustomFields(false)}>{t("cancel")}</button>}
          </div>
        </div>
        )}
        {activeTab === "list" && <TaskListView tasks={tasks} onTaskClick={openTaskViewModal} />}
        {activeTab === "grid" && <TaskGridView tasks={tasks} onTaskClick={openTaskViewModal} />}
        {activeTab === "kanban" && <TaskKanbanView tasks={tasks} onTaskClick={openTaskViewModal} />}
        {activeTab === "gantt" && <TaskGanttView tasks={tasks} onTaskClick={openTaskViewModal} />}
      </div>


      {showTaskViewModal && <TaskViewModal task={selectedTask} onClose={closeTaskViewModal} />}
      {showTaskCreateModal && <TaskCreateModal onClose={closeTaskCreateModal} />}
    </div>
  );
};

export default ProjectView;
