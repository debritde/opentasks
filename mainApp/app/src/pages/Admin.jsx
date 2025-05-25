import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";

import OptionsTaskStatus from "../components/OptionsTaskStatus";
import OptionsProjectStatus from "../components/OptionsProjectStatus";
import OptionsTaskPrioritys from "../components/OptionsTaskPrioritys";
import AdminUserManagement from "../components/AdminUserManagement";
import AdminGroupManagement from "../components/AdminGroupManagement";
import AdminUpdate from "../components/AdminUpdate";
import { useTranslation } from "react-i18next";

import config from "../config/config.json";
import AdminBackups from "../components/AdminBackups";
import AdminMailSettings from "../components/AdminMailSettings";

const Admin = () => {
  const location = useLocation();
  const projectId = location.pathname.split("/").pop();
  const [activeTab, setActiveTab] = useState("taskStatus");
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskViewModal, setShowTaskViewModal] = useState(false);
  const [showTaskCreateModal, setShowTaskCreateModal] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [project, setProject] = useState(null);
  const token = localStorage.getItem("token");
  const { t, i18n } = useTranslation();

  return (
    <div className="projects-container">
        <div className="tabs">
          <button onClick={() => setActiveTab("taskStatus")}>{t("task_status")}</button>
          <button onClick={() => setActiveTab("projectStatus")}>{t("project_status")}</button>
          <button onClick={() => setActiveTab("taskPrioritys")}>{t("task_priorities")}</button>
          <button onClick={() => setActiveTab("userManagement")}>{t("user_management")}</button>
          <button onClick={() => setActiveTab("groupManagement")}>{t("group_management")}</button>
          <button onClick={() => setActiveTab("backups")}>{t("backups")}</button>
          <button onClick={() => setActiveTab("systemMailSettings")}>{t("system_mail_settings")}</button>
          <button onClick={() => setActiveTab("systemUpdate")}>{t("system_update")}</button>
        </div>

        <div className="tab-content">
          {activeTab === "taskStatus" && <OptionsTaskStatus />}
          {activeTab === "projectStatus" && <OptionsProjectStatus />}
          {activeTab === "taskPrioritys" && <OptionsTaskPrioritys />}
          {activeTab === "userManagement" && <AdminUserManagement />}
          {activeTab === "groupManagement" && <AdminGroupManagement />}
          {activeTab === "backups" && <AdminBackups />}
          {activeTab === "systemMailSettings" && <AdminMailSettings />}
          {activeTab === "systemUpdate" && <AdminUpdate />}
        </div>
    </div>
  );
};

export default Admin;
