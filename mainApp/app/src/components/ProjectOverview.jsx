import { useState, useEffect } from "react";
import { FaCalendarAlt, FaUsers, FaInfoCircle } from "react-icons/fa";
import Select from "react-select";
import ProgressBar from "@ramonak/react-progress-bar";

const ProjectOverview = ({
  project,
  users,
  projectStatuses,
  t,
  onProjectUpdate,
  errorMessage,
  setErrorMessage,
  fetchMail2TicketDetails,
  tasks,
  customFields,
  setCustomFields,
  loadingCustomFields,
  handleCustomFieldSubmit,
  handleDeleteCustomField,
  handleStartEditCustomField,
  handleSaveEditCustomField,
  handleCancelEditCustomField,
  editingFieldId,
  editingFieldTitle,
  setEditingFieldTitle,
  editingFieldType,
  setEditingFieldType,
  editingFieldRequired,
  setEditingFieldRequired,
  customFieldTypeOptions,
  title,
  setTitle,
  type,
  setType,
  required,
  setRequired,
  dropdownValues,
  setDropdownValues,
  isEditingCustomFields,
  setIsEditingCustomFields,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editProject, setEditProject] = useState(project);
  const [selectedMembers, setSelectedMembers] = useState(
    project?.members
      ? project.members.map((member) => ({
          value: member._id,
          label: member.name || member.username || member.firstname + " " + member.lastname,
        }))
      : []
  );

  useEffect(() => {
    setEditProject(project);
    setSelectedMembers(
      project?.members
        ? project.members.map((member) => ({
            value: member._id,
            label: member.name || member.username || member.firstname + " " + member.lastname,
          }))
        : []
    );
  }, [project]);

  const handleEdit = async () => {
    if (editProject.isServiceDesk && fetchMail2TicketDetails) {
      await fetchMail2TicketDetails();
    }
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditProject(project);
    setErrorMessage && setErrorMessage("");
  };

  const handleSave = () => {
    // selectedMembers ist ein Array von { value, label }
    const memberIds = Array.isArray(selectedMembers)
    console.log("selectedMembers")
    console.log(selectedMembers)
      ? selectedMembers.map(m => m.value).filter(Boolean)
      : [];

    fetch(`/projects/${project._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: token },
      body: JSON.stringify({
        ...editProject,
        members: memberIds
      })
    }).then(() => {
      setIsEditing(false);
      // Optional: onProjectUpdate() oder ähnliches aufrufen
    });
  };


  if (!project) return null;

  // Task-Statistiken
  const totalTasks = tasks?.length || 0;
  const openTasks = tasks?.filter((task) => !task.isDone).length || 0;
  const progress = totalTasks ? ((100 - (100 / totalTasks * openTasks)).toFixed(2)) : 0;

  return (
    <div className="project-overview-widget-container">
      <div className="project-overview-card project-overview-fancy" style={{ minWidth: 340, flex: 2 }}>
        {isEditing ? (
          <>
            <span style={{ color: "red" }}>{errorMessage}</span>
            <input
              type="text"
              value={editProject.title}
              onChange={(e) => setEditProject({ ...editProject, title: e.target.value })}
              placeholder={t("title")}
            />
            <textarea
              value={editProject.description}
              onChange={(e) => setEditProject({ ...editProject, description: e.target.value })}
              placeholder={t("description")}
            />
            <input
              type="datetime-local"
              value={editProject.deadline || ""}
              onChange={(e) => setEditProject({ ...editProject, deadline: e.target.value })}
            />
            <Select
              isMulti
              options={users}
              value={selectedMembers}
              onChange={setSelectedMembers}
              placeholder={t("choose_assigned_users")}
            />
            <Select
              options={projectStatuses}
              value={projectStatuses.find((status) => status.label === editProject.status)}
              onChange={(option) => setEditProject({ ...editProject, status: option.label })}
              placeholder={t("status")}
            />
            <label>
              <input
                type="checkbox"
                checked={editProject.isServiceDesk}
                onChange={(e) => setEditProject({ ...editProject, isServiceDesk: e.target.checked })}
              />{" "}
              {t("is_servicedesk")}
            </label>
            {editProject.isServiceDesk && (
              <div className="modal-mail2ticket-fields-container">
                <div className="modal-mail2ticket-fields-group">
                  <input
                    type="text"
                    placeholder="IMAP Host"
                    value={editProject.imapHost || ""}
                    onChange={(e) => setEditProject({ ...editProject, imapHost: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="IMAP Port"
                    value={editProject.imapPort || ""}
                    onChange={(e) => setEditProject({ ...editProject, imapPort: e.target.value })}
                  />
                </div>
                <div className="modal-mail2ticket-fields-group">
                  <input
                    type="text"
                    placeholder="IMAP User"
                    value={editProject.imapUser || ""}
                    onChange={(e) => setEditProject({ ...editProject, imapUser: e.target.value })}
                  />
                  <input
                    type="password"
                    placeholder="IMAP Password"
                    value={editProject.imapPassword || ""}
                    onChange={(e) => setEditProject({ ...editProject, imapPassword: e.target.value })}
                  />
                </div>
                <div className="modal-mail2ticket-fields-group">
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={editProject.emailAddress || ""}
                    onChange={(e) => setEditProject({ ...editProject, emailAddress: e.target.value })}
                  />
                  <input
                    type="number"
                    placeholder="Check Period (minutes)"
                    value={editProject.checkPeriodInMinutes || ""}
                    onChange={(e) => setEditProject({ ...editProject, checkPeriodInMinutes: e.target.value })}
                  />
                </div>
                <div className="modal-mail2ticket-fields-group">
                  <input
                    type="text"
                    placeholder="SMTP Host"
                    value={editProject.smtpHost || ""}
                    onChange={(e) => setEditProject({ ...editProject, smtpHost: e.target.value })}
                  />
                  <input
                    type="text"
                    placeholder="SMTP Port"
                    value={editProject.smtpPort || ""}
                    onChange={(e) => setEditProject({ ...editProject, smtpPort: e.target.value })}
                  />
                </div>
                <div className="modal-mail2ticket-fields-group">
                  <input
                    type="text"
                    placeholder="SMTP User"
                    value={editProject.smtpUser || ""}
                    onChange={(e) => setEditProject({ ...editProject, smtpUser: e.target.value })}
                  />
                  <input
                    type="password"
                    placeholder="SMTP Password"
                    value={editProject.smtpPassword || ""}
                    onChange={(e) => setEditProject({ ...editProject, smtpPassword: e.target.value })}
                  />
                </div>
                <div className="modal-mail2ticket-fields-group">
                  <label>
                    <input
                      type="checkbox"
                      checked={editProject.smtpSecure || false}
                      onChange={(e) => setEditProject({ ...editProject, smtpSecure: e.target.checked })}
                    />{" "}
                    SMTP Secure
                  </label>
                </div>
              </div>
            )}
            <div className="project-overview-actions">
              <button className="button-violet" onClick={handleSave}>
                {t("save")}
              </button>
              <button onClick={handleCancel}>{t("cancel")}</button>
            </div>
          </>
        ) : (
          <>
            <h2 className="project-title">{project.title}</h2>
            <p className="project-description">{project.description}</p>
            <div className="project-overview-details">
              <div className="project-overview-detail">
                <FaCalendarAlt className="project-icon" />
                <span>
                  <strong>{t("deadline")}:</strong>{" "}
                  {project.deadline
                    ? new Date(project.deadline).toLocaleString()
                    : t("none")}
                </span>
              </div>
              <div className="project-overview-detail">
                <FaUsers className="project-icon" />
                <strong>{t("members")}:</strong>
                <span className="project-members">
                  {project.members && project.members.length > 0
                    ? project.members.map((member) => (
                        <span className="member-badge" key={member._id || member.name}>
                          {member.name || member.username || member.firstname + " " + member.lastname}
                        </span>
                      ))
                    : <span className="member-badge member-badge-empty">{t("none")}</span>}
                </span>
              </div>
              <div className="project-overview-detail">
                <strong>{t("status")}:</strong>{" "}
                {projectStatuses.find((status) => status.label === project?.status)?.label || t("unknown")}
              </div>
              <div className="project-overview-detail">
                <strong>{t("is_servicedesk")}:</strong>{" "}
                {project.isServiceDesk ? "☑️" : "❌"}
              </div>
            </div>
            <div className="project-overview-actions">
              <button className="button-violet" onClick={handleEdit}>
                {t("edit")}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Task-Widgets */}
      <div className="project-overview-widget">
        <h2>{t("total_tasks")}</h2>
        <h2>{totalTasks}</h2>
      </div>
      <div className="project-overview-widget">
        <h2>{t("open_tasks")}</h2>
        <h2>{openTasks}</h2>
        <ProgressBar className="progress-bar" style={{ alignSelf: "flex-end" }} bgColor="#99ff99" labelColor="#000000" completed={progress} />
      </div>

      {/* Custom Fields Widget */}
      <div className="project-overview-widget" style={{ minWidth: 340 }}>
        <h2>{t("custom_fields")}</h2>
        {loadingCustomFields ? (
          <div>{t("loading")}...</div>
        ) : (
          <>
            <ul>
              {customFields.map((field) => (
                <li key={field._id}>
                  {editingFieldId === field._id ? (
                    <>
                      <input
                        value={editingFieldTitle}
                        onChange={e => setEditingFieldTitle(e.target.value)}
                        placeholder={t("title")}
                      />
                      <Select
                        options={customFieldTypeOptions}
                        value={customFieldTypeOptions.find(opt => opt.value === editingFieldType)}
                        onChange={opt => setEditingFieldType(opt.value)}
                        placeholder={t("type")}
                      />
                      <label>
                        <input
                          type="checkbox"
                          checked={editingFieldRequired}
                          onChange={e => setEditingFieldRequired(e.target.checked)}
                        />{" "}
                        {t("required")}
                      </label>
                      <button onClick={handleSaveEditCustomField}>{t("save")}</button>
                      <button onClick={handleCancelEditCustomField}>{t("cancel")}</button>
                    </>
                  ) : (
                    <>
                      <b>{field.title}</b> ({field.type}) {field.required ? "*" : ""}
                      <button onClick={() => handleStartEditCustomField(field)}>{t("edit")}</button>
                      <button onClick={() => handleDeleteCustomField(field._id)}>{t("delete")}</button>
                    </>
                  )}
                </li>
              ))}
            </ul>
            {isEditingCustomFields ? (
              <form onSubmit={handleCustomFieldSubmit}>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={t("title")}
                  required
                />
                <Select
                  options={customFieldTypeOptions}
                  value={customFieldTypeOptions.find(opt => opt.value === type)}
                  onChange={opt => setType(opt.value)}
                  placeholder={t("type")}
                />
                <label>
                  <input
                    type="checkbox"
                    checked={required}
                    onChange={e => setRequired(e.target.checked)}
                  />{" "}
                  {t("required")}
                </label>
                {type === "dropdown" && (
                  <div>
                    {dropdownValues.map((val, idx) => (
                      <input
                        key={idx}
                        value={val}
                        onChange={e => {
                          const arr = [...dropdownValues];
                          arr[idx] = e.target.value;
                          setDropdownValues(arr);
                        }}
                        placeholder={t("dropdown_option")}
                      />
                    ))}
                    <button type="button" onClick={() => setDropdownValues([...dropdownValues, ""])}>+</button>
                  </div>
                )}
                <button type="submit">{t("add")}</button>
                <button type="button" onClick={() => setIsEditingCustomFields(false)}>{t("cancel")}</button>
              </form>
            ) : (
              <button onClick={() => setIsEditingCustomFields(true)}>{t("add_custom_field")}</button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ProjectOverview;