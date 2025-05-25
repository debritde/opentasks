import { useState, useEffect } from "react";
import Select from "react-select";
import config from "../config/config.json";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import no from '../functions/no.js'

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

const TaskCreateModal = ({ task, onClose }) => {
  const [title, setTitle] = useState(task ? task.title : "");
  const [description, setDescription] = useState(task ? task.description : "");
  const [assignedUsers, setAssignedUsers] = useState(task ? task.assignedUsers : []);
  const [status, setStatus] = useState(task ? task.status : "new");
  const [priority, setPriority] = useState(task ? task.priority : null);
  const [attachments, setAttachments] = useState([]);
  const [startDate, setStartDate] = useState(task ? task.startDate : "");
  const [endDate, setEndDate] = useState(task ? task.endDate : "");
  const [users, setUsers] = useState([]);
  const [statusOptions, setStatusOptions] = useState([]);
  const [priorityOptions, setPriorityOptions] = useState([]);
  const [priorityOptionsError, setPriorityOptionsError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdByUserId, setCreatedByUserId] = useState("");
  const [createdByEmailAddress, setCreatedByEmailAddress] = useState("");
  const [isSubTask, setIsSubTask] = useState(false);
  const [parentTaskId, setParentTaskId] = useState(null);
  const [parentTaskTicketNumber, setParentTaskTicketNumber] = useState(null);
  const [availableTasks, setAvailableTasks] = useState([]);
  const { t, i18n } = useTranslation();
  const [projectCustomFields, setProjectCustomFields] = useState([]);
  const [customFieldValues, setCustomFieldValues] = useState([]);

  const token = localStorage.getItem("token");
  const location = useLocation();
  const projectId = location.pathname.split("/").pop();

  const [customFields, setCustomFields] = useState([]);
  const [loadingCustomFields, setLoadingCustomFields] = useState(true);
  

  useEffect(() => {
    fetch(`${apiUrl}/tasks`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        console.log(data)
        const filteredTasks = data.tasks.filter(t => t.project._id === projectId && !t.isSubTask);
        setAvailableTasks(filteredTasks.map(t => ({ value: t._id, label: t.title, ticketNumber: t.ticketNumber})));
      })
      .catch((err) => console.error("Fehler beim Laden der Tasks:", err));
  }, [projectId]);

  useEffect(() => {
      const fetchProjectMembers = async () => {
        try {
          const response = await fetch(`${apiUrl}/projects/${projectId}`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "Authorization": token,
            },
          });
          const data = await response.json();
          if (data.status === "success" && data.project.members.length > 0) {
            const usersData = await Promise.all(
              data.project.members.map(async (member) => {
                const userRes = await fetch(`${apiUrl}/users/${member._id}`, {
                  method: "GET",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": token,
                  },
                });
                return userRes.json();
              })
            );
            setUsers(usersData.map(userData => ({
              value: userData.user._id,
              label: `${userData.user.firstname} ${userData.user.lastname} (${userData.user.username})`
            })));
          }
        } catch (error) {
          console.error("Fehler beim Laden der Projektmitglieder:", error);
        }
      };
  
    const fetchCurrentUser = async () => {
      try {
        const tokenResponse = await fetch(`${apiUrl}/users/byLoginToken`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": token
          },
          body: JSON.stringify({ loginToken: token })
        });

        if (!tokenResponse.ok) {
          throw new Error("Fehler beim Abrufen der Benutzer-ID");
        }

        const tokenData = await tokenResponse.json();
        setCreatedByUserId(tokenData.user._id);

        const userResponse = await fetch(`${apiUrl}/users/${tokenData.user._id}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": token
          }
        });

        if (!userResponse.ok) {
          throw new Error("Fehler beim Abrufen der Benutzer-E-Mail-Adresse");
        }

        const userData = await userResponse.json();
        setCreatedByEmailAddress(userData.email);
      } catch (err) {
        console.error(err);
        setError("Fehler beim Abrufen der Benutzerinformationen");
      }
    };

    const fetchStatusOptions = async () => {
      try {
        const response = await fetch(`${apiUrl}/config/taskStatuses`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": token
          }
        });

        if (!response.ok) {
          throw new Error("Fehler beim Abrufen der Statusoptionen");
        }

        const statusData = await response.json();
        const formattedStatuses = statusData.map((item) => ({
          value: item.name,
          label: item.name
        }));
        setStatusOptions(formattedStatuses);
      } catch (err) {
        console.error(err);
        setError("Fehler beim Laden der Statusoptionen.");
      }
    };

    const fetchPriorityOptions = async () => {
      try {
        const response = await fetch(`${apiUrl}/config/taskPriorities`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": token
          }
        });

        if (!response.ok) {
          throw new Error("Fehler beim Abrufen der Prioritätsoptionen");
        }

        const priorityData = await response.json();
        if (!priorityData || priorityData.length === 0) {
          setPriorityOptionsError(
            <div>
              {t("no_priority_options_found")}
              <br />
              <button
                className="button-small button-violet"
                onClick={() => window.open('/admin', '_blank')}
              >
                {t("go_to_admin_prios")}
              </button>
            </div>
          );
          setPriorityOptions([]);
        } else {
          setPriorityOptions(priorityData.map((item) => ({
            value: item.name,
            label: item.name
          })));
          setPriorityOptionsError("");
        }
      } catch (err) {
        setPriorityOptionsError(
          <div>
            {t("no_priority_options_found")}
            <br />
            <button
              className="button-small button-violet"
              onClick={() => window.open('/admin', '_blank')}
            >
              {t("go_to_admin_prios")}
            </button>
          </div>
        );
        setPriorityOptions([]);
      }
    };

    fetchProjectMembers();
    fetchCurrentUser();
    fetchStatusOptions();
    fetchPriorityOptions();
  }, [projectId, token]);


  useEffect(() => {
    const fetchCustomFields = async () => {
      try {
        const response = await fetch(`${apiUrl}/customFields/tasks?projectId=${projectId}`, {
          method: "GET",
          headers: { 
            "Content-Type": "application/json", 
            "Authorization": token 
          }
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

  const handleSubmit = async () => {
    if (localStorage.easterEggMode == "true" && (!title || title === "")) {
      no();
      setError(t("error_title_required"));
    }
    else if (!localStorage.easterEggMode && (!title || title === "")) {
      setError(t("error_title_required"));
    }
    else {
      setLoading(true);
      setError("");
      try {
          const payload = {
              title,
              description,
              status,
              priority,
              startDate,
              endDate,
              project: projectId,
              assignedUsers: assignedUsers.map(member => (member.value)),
              isSubTask,
              parentTaskId: isSubTask ? parentTaskId : null,
              parentTaskTicketNumber: isSubTask ? parentTaskTicketNumber : null,
              createdByUserId,
              createdByEmailAddress,
              // ##### NEU: Füge Custom Field Values dem Payload hinzu
              customFields: customFieldValues
          };

          const response = await fetch(`${apiUrl}/tasks/`, {
              method: "POST",
              headers: {
                  "Content-Type": "application/json",
                  "Authorization": token
              },
              body: JSON.stringify(payload)
          });

          if (!response.ok) throw new Error("Fehler beim Speichern des Tasks");

          await response.json();
          onClose();
      } catch (err) {
          setError(err.message);
      } finally {
          setLoading(false);
      }
    }
  };

  const handleFileChange = (e) => {
    setAttachments([...e.target.files]);
  };

  const handleCustomFieldChange = (fieldId, newTitle, newValue) => {
    setCustomFieldValues(prevValues =>
      prevValues.map(val =>
        val.customField === fieldId ? { ...val, title: newTitle, value: newValue } : val
      )
    );
  };

  useEffect(() => {
    const fetchProjectCustomFields = async () => {
      try {
        const response = await fetch(`${apiUrl}/customFields/tasks?projectId=${projectId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": token
          }
        });
        const data = await response.json();
        if (data.status === "success") {
          setProjectCustomFields(data.taskCustomFields);
          // Initialisiere customFieldValues mit leeren Werten
          const initialValues = data.taskCustomFields.map(field => ({
            customField: field._id,
            value: ""
          }));
          setCustomFieldValues(initialValues);
        }
      } catch (error) {
        console.error("Fehler beim Laden der Projekt-Custom Fields:", error);
      }
    };
    fetchProjectCustomFields();
  }, [projectId, token]);

  const handleClose = () => {
    const hasValues =
      title.trim() !== "" ||
      description.trim() !== "" ||
      assignedUsers.length > 0 ||
      (customFieldValues && customFieldValues.some(f => f.value && f.value !== ""));
    if (!hasValues) {
      onClose();
    } else {
      if (window.confirm(t("confirm_close_task_create"))) {
        onClose();
      }
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>{task ? t("edit_task") : t("new_task")}</h2>

        {error && <p className="error-message">{error}</p>}

        <div className="modal-form">
          <div className="modal-row">
            <div className="modal-column">
              <label>{t("title")}:</label>
              <input
                type="text"
                className="modal-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("title")}
              />
            </div>
            <div className="modal-column">
              <label>{t("description")}:</label>
              <textarea
                className="modal-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("description")}
              />
            </div>
          </div>

          <div className="modal-row">
            <div className="modal-column">
              <label>{t("status")}:</label>
              <Select
                options={statusOptions}
                value={statusOptions.find(opt => opt.value === status) || null}
                onChange={(selectedOption) => setStatus(selectedOption.value)}
              />
            </div>
            <div className="modal-column">
              <label>{t("priorities")}:</label>
              {priorityOptionsError ? (
                <div className="error-message">{priorityOptionsError}</div>
              ) : (
                <Select
                  options={priorityOptions}
                  value={priorityOptions.find(opt => opt.value === priority) || null}
                  onChange={(selectedOption) => setPriority(selectedOption.value)}
                />
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
                onChange={(newMembers) => setAssignedUsers(newMembers.map(user => ({
                  value: user._id || user.value,
                  label: user.label || `${user.firstname} ${user.lastname} (${user.username})`
                })))}
                placeholder={t("choose_assigned_users")}
              />
            </div>
          </div>

          <div className="modal-row">
            <div className="modal-column">
              <label>{t("starts_at")}:</label>
              <input
                type="datetime-local"
                className="modal-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="modal-column">
              <label>{t("ends_at")}:</label>
              <input
                type="datetime-local"
                className="modal-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>



          <div className="modal-row">
            <div className="modal-column">
              <label>
                <input
                  type="checkbox"
                  checked={isSubTask}
                  onChange={(e) => setIsSubTask(e.target.checked)}
                /> {t("is_subtask")}
              </label>
              {isSubTask && (
                <Select
                  options={availableTasks}
                  value={availableTasks.find(t => t.value === parentTaskId) || null}
                  placeholder={t("choose_main_task")}
                  onChange={(option) => {
                    setParentTaskId(option.value);
                    setParentTaskTicketNumber(option.ticketNumber);
                  }}
                />
              )}
            </div>
            <div className="modal-column">
              <label>{t("attachments")}:</label>
              <input type="file" multiple onChange={handleFileChange} />
            </div>
          </div>
        </div>

        {projectCustomFields.length > 0 && (
          <div className="custom-fields-section">
            <h3>{t("custom_fields")}</h3>
            {loadingCustomFields ? (
              <p>{t("loading_custom_fields")}</p>
            ) : (
              projectCustomFields.map(field => (
                <div key={field._id} className="custom-field">
                  <label>{field.title}{field.required ? " *" : ""}:</label>
                  {field.type === "dropdown" ? (
                    <Select
                      options={JSON.parse(field.options).map(option => ({ value: option, label: option }))}
                    />
                  ) : (
                    <input type={field.type} />
                  )}
                </div>
              ))
            )}
          </div>
        )}

        <div className="modal-actions">
          <button className="button-red" onClick={handleClose} disabled={loading}>
            {t("close")}
          </button>
          <button className="button-violet" onClick={handleSubmit} disabled={loading}>
            {loading ? t("is_saving") : t("save")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskCreateModal;
