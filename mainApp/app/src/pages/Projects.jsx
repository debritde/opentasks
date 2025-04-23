import { useEffect, useState } from "react";
import Select from "react-select";
import { useTranslation } from "react-i18next";
import config from "../config/config.json";
import { Link } from "react-router-dom";
import "../i18n";
import no from '../functions/no.js'

const apiUrl = import.meta.env.VITE_APP_API_URL || "http://localhost:3001";


const Projects = () => {
  const { t } = useTranslation();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [canCreate, setCanCreate] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [errorMessage, setErrorMessage] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [showDoneProjects, setShowDoneProjects] = useState(false);

  const [newProject, setNewProject] = useState({
    title: "",
    description: "",
    deadline: new Date().toISOString().slice(0, 16),
    members: [],
    isServiceDesk: false,
    imapHost: "",
    imapPort: "",
    imapUser: "",
    imapPassword: "",
    emailAddress: "",
    checkPeriodInMinutes: "",
    smtpHost: "",
    smtpPort: "",
    smtpUser: "",
    smtpPassword: "",
    smtpSecure: false
  });

  useEffect(() => {
    const fetchProjects = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const response = await fetch(`${apiUrl}/projects/own`, {
          method: "GET",
          headers: { "Content-Type": "application/json", "Authorization": `${token}` }
        });
        const data = await response.json();
        if (data.status === "success") setProjects(data.projects);
      } catch (error) {
        console.error(t("error_loading_projects"), error);
      } finally {
        setLoading(false);
      }
    };

    const checkPermissions = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const response = await fetch(`${apiUrl}/user/permissions`, {
          method: "GET",
          headers: { "Content-Type": "application/json", "Authorization": `${token}` }
        });
        const data = await response.json();
        if (data.status === "success" && data.permissions.includes("create_projects") || data.status === "success" && data.isAdmin) setCanCreate(true);
      } catch (error) {
        console.error(t("error_checking_permissions"), error);
      }
    };

    const fetchUsers = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const response = await fetch(`${apiUrl}/users`, {
          method: "GET",
          headers: { "Content-Type": "application/json", "Authorization": `${token}` }
        });
        const data = await response.json();
        if (data.status === "success") {
          setUsers(data.users.map(user => ({ value: user._id, label: `${user.firstname} ${user.lastname} (${user.username})` })));
        }
      } catch (error) {
        console.error(t("error_loading_users"), error);
      }
    };

    const fetchStatusData = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const response = await fetch(`${apiUrl}/config/projectStatuses`, {
          method: "GET",
          headers: { "Content-Type": "application/json", "Authorization": `${token}` }
        });
        const data = await response.json();
        if (Array.isArray(data)) {
          setStatusData(data);
        }
      } catch (error) {
        console.error("Error loading project status data:", error);
      }
    };

    fetchStatusData()
    fetchProjects();
    checkPermissions();
    fetchUsers();
  }, []);

  const handleCreateProject = async (e) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    //EASTEREGG
    if (localStorage.easterEggMode == "true" && (!newProject.title ||newProject.title == "" || newProject.title == undefined)) {
      no()
      setErrorMessage(t("error_title_required"))
    }
    else if (!localStorage.easterEggMode && (!newProject.title ||newProject.title == "" || newProject.title == undefined)){
      setErrorMessage(t("error_title_required"))
    }

    try {
      const response = await fetch(`${apiUrl}/projects`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `${token}` },
        body: JSON.stringify({
          title: newProject.title,
          description: newProject.description,
          deadline: newProject.deadline,
          members: newProject.members,
          isServiceDesk: newProject.isServiceDesk
        })
      });

      const data = await response.json();
      if (data.status === "success") {
        setProjects([...projects, data.project]);
        if (newProject.isServiceDesk) {
          await fetch(`${apiUrl}/mail2ticket`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `${token}` },
            body: JSON.stringify({
              projects: [data.project._id],
              imapHost: newProject.imapHost,
              imapPort: newProject.imapPort,
              imapUser: newProject.imapUser,
              imapPassword: newProject.imapPassword,
              emailAddress: newProject.emailAddress,
              checkPeriodInMinutes: newProject.checkPeriodInMinutes,
              smtpHost: newProject.smtpHost,
              smtpPort: newProject.smtpPort,
              smtpUser: newProject.smtpUser,
              smtpPassword: newProject.smtpPassword,
              smtpSecure: newProject.smtpSecure
            })
          });
        }
        setShowModal(false);
      }
    } catch (error) {
      console.error(t("error_creating_project"), error);
    }
  };

  if (loading) return <div>{t("loading_projects")}</div>;

  return (
    <div>
      <h1>{t("projects_title")}</h1>
      <div style={{"display": "flex", "gap": "10px"}}>
        {canCreate && <button onClick={() => setShowModal(true)}>{t("create_project")}</button>}
        <button onClick={() => setShowDoneProjects(!showDoneProjects)}>
          {showDoneProjects ? t("hide_done_projects") : t("show_done_projects")}
        </button>
      </div>
      {projects.length === 0 ? (
        <p>{t("no_projects")}</p>
      ) : (
        <div className="projects-container">
          {projects
            .filter((project) => {
              const projectStatus = statusData.find(status => status.name === project.status);
              return showDoneProjects || !projectStatus?.isDone;
            })
            .map((project) => {
              const projectStatus = statusData.find(status => status.name === project.status);
              return (
                <Link key={project._id} to={`/project/view/${project._id}`}>
                  <div className="project-card" style={{ borderLeft: `5px solid ${projectStatus?.color || "#000"}` }}>
                    <h3>{project.title}</h3>
                    <p>{project.description}</p>
                    <p><strong>{t("status")}:</strong> {projectStatus?.name || project.status}</p>
                    <p><strong>{t("deadline")}:</strong> {new Date(project.deadline).toLocaleString()}</p>
                  </div>
                </Link>
              );
            })}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>{t("new_project")}</h2>
            <span style={{"color" : "red"}}>{errorMessage}</span>
            <input type="text" placeholder={t("title_placeholder")} onChange={(e) => setNewProject({...newProject, title: e.target.value})} />
            <textarea placeholder={t("description_placeholder")} onChange={(e) => setNewProject({...newProject, description: e.target.value})}></textarea>
            <label>{t("deadline")}</label>
            <input type="datetime-local" value={newProject.deadline} onChange={(e) => setNewProject({...newProject, deadline: e.target.value})} />
            <label>{t("members")}</label>
            <Select isMulti options={users} onChange={(selectedOptions) => setNewProject({...newProject, members: selectedOptions.map(option => option.value)})} />
            <label>
              <input type="checkbox" checked={newProject.isServiceDesk} onChange={(e) => setNewProject({...newProject, isServiceDesk: e.target.checked})} /> {t("is_service_desk")}
            </label>
            {newProject.isServiceDesk && (
              <div className="modal-mail2ticket-fields-container">
                <div className="modal-mail2ticket-fields-group">
                  <input type="text" placeholder="IMAP Host" onChange={(e) => setNewProject({...newProject, imapHost: e.target.value})} />
                  <input type="text" placeholder="IMAP Port" onChange={(e) => setNewProject({...newProject, imapPort: e.target.value})} />
                </div>
                  
                <div className="modal-mail2ticket-fields-group">
                  <input type="text" placeholder="IMAP User" onChange={(e) => setNewProject({...newProject, imapUser: e.target.value})} />
                  <input type="password" placeholder="IMAP Password" onChange={(e) => setNewProject({...newProject, imapPassword: e.target.value})} />
                </div>
                  
                <div className="modal-mail2ticket-fields-group">
                  <input type="email" placeholder="Email Address" onChange={(e) => setNewProject({...newProject, emailAddress: e.target.value})} />
                  <input type="number" placeholder="Check Period (minutes)" onChange={(e) => setNewProject({...newProject, checkPeriodInMinutes: e.target.value})} />
                </div>
                  
                <div className="modal-mail2ticket-fields-group">
                  <input type="text" placeholder="SMTP Host" onChange={(e) => setNewProject({...newProject, smtpHost: e.target.value})} />
                  <input type="text" placeholder="SMTP Port" onChange={(e) => setNewProject({...newProject, smtpPort: e.target.value})} />
                </div>
                  
                <div className="modal-mail2ticket-fields-group">                
                  <input type="text" placeholder="SMTP User" onChange={(e) => setNewProject({...newProject, smtpUser: e.target.value})} />
                  <input type="password" placeholder="SMTP Password" onChange={(e) => setNewProject({...newProject, smtpPassword: e.target.value})} />
                </div>  

                <div className="modal-mail2ticket-fields-group">
                  <label>
                    <input type="checkbox" checked={newProject.smtpSecure} onChange={(e) => setNewProject({...newProject, smtpSecure: e.target.checked})} /> SMTP Secure
                  </label>
                </div>
              </div>
            )}
            <button onClick={(e) => handleCreateProject(e)}>{t("create")}</button>
            <button onClick={() => setShowModal(false)}>{t("cancel")}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
