import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import config from "../config/config.json";
import Select from "react-select";

import "../i18n";

const apiUrl = import.meta.env.VITE_APP_API_URL || "http://localhost:3001";


const AdminGroupManagement = () => {
  const { t } = useTranslation();
  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newGroup, setNewGroup] = useState({ name: "", permissions: [] });
  const [editGroup, setEditGroup] = useState(null);
  const [selectedUser, setSelectedUser] = useState("");
  
  const permissionOptions = [
    { value: "create_projects", label: t("create_project") },
    { value: "create_tasks", label: t("create_tasks") }
  ];

  const fetchGroupsAndUsers = async () => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const [groupRes, userRes] = await Promise.all([
        fetch(`${apiUrl}/groups`, { headers: { "Authorization": token } }),
        fetch(`${apiUrl}/users`, { headers: { "Authorization": token } }),
      ]);
      
      const groupData = await groupRes.json();
      const userData = await userRes.json();
      console.log(userData)
      
      if (groupData.status === "success") setGroups(groupData.groups);
      if (userData.status === "success") setUsers(userData.users);
    } catch (error) {
      console.error(t("error_loading_data"), error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchGroupsAndUsers();
  }, [t]);


  const handleUpdateGroupUsers = async (groupId, selectedUsers) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const selectedUserIds = selectedUsers.map(user => user.value);
      
      const response = await fetch(`${apiUrl}/groups/${groupId}/update-members`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": token,
        },
        body: JSON.stringify({ userIds: selectedUserIds }),
      });
      
      const data = await response.json();
      if (data.status === "success") {
        setGroups(groups.map(group => 
          group._id === groupId ? { ...group, users: selectedUserIds } : group
        ));
      }
      fetchGroupsAndUsers();

    } catch (error) {
      console.error(t("error_updating_group"), error);
    }
  };

  const handleDeleteGroup = async (id) => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const response = await fetch(`${apiUrl}/groups/${id}`, {
        method: "DELETE",
        headers: { "Authorization": token },
      });

      const data = await response.json();
      if (data.status === "success") setGroups(groups.filter(group => group._id !== id));
      fetchGroupsAndUsers();

    } catch (error) {
      console.error(t("error_deleting_group"), error);
    }
  };



  const handleUpdateGroup = async () => {
    if (!editGroup) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
        const response = await fetch(`${apiUrl}/groups/${editGroup._id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token,
            },
            body: JSON.stringify({
                name: editGroup.name,
                permissions: editGroup.permissions.join(","), // Array in String umwandeln
            }),
        });

        const data = await response.json();
        if (data.status === "success") {
            setGroups(groups.map(group => (group._id === editGroup._id ? data.group : group)));
            setEditGroup(null);
        }
        fetchGroupsAndUsers();
    } catch (error) {
        console.error(t("error_updating_group"), error);
    }
};

const handleAddGroup = async () => {
    if (!newGroup.name) return;
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
        const response = await fetch(`${apiUrl}/groups`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token,
            },
            body: JSON.stringify({
                name: newGroup.name,
                permissions: newGroup.permissions.join(","), // Array in String umwandeln,
                members: newGroup.members.map(m => m.value),
            }),
        });

        const data = await response.json();
        if (data.status === "success") setGroups([...groups, data.group]);
        fetchGroupsAndUsers();

    } catch (error) {
        console.error(t("error_creating_group"), error);
    }
};

  if (loading) return <div>{t("loading_groups")}</div>;

  return (
    <div>
      <h1>{t("group_management")}</h1>
      <div className="status-option-container">
        <div className="group-management-card">
          <span>{t("group_name")}</span>
          <span>{t("permissions")}</span>
          <span>{t("member")}</span>
          <span>{t("actions")}</span>
        </div>
        {groups.length === 0 ? (
          <p>{t("no_groups_found")}</p>
        ) : (
          groups.map((group) => (
            <div key={group._id} className="group-management-card">
                <span>{group.name}</span>
                <div /* style={{border: "1px solid grey", padding: "10px", borderRadius: "5px"}} */>
                  {group.permissions.length > 0 ? (
                    group.permissions[0].split(",").map(p => {
                      const label = permissionOptions.find(opt => opt.value === p)?.label || p;
                      return (
                        <div className="badge">
                          <span key={p}>
                            {label}
                          </span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="badge">
                      <span>{t("no_permissions")}</span>
                    </div>
                  )}
                </div>
                <Select
                  isMulti
                  options={users.map(user => ({ value: user._id, label: user.username }))}
                  value={users.filter(user => user.groups?.includes(group._id)).map(user => ({ value: user._id, label: user.username }))}
                  onChange={(selected) => handleUpdateGroupUsers(group._id, selected)}
                />
                <div>
                  <button onClick={() => setEditGroup(group)}>{t("edit")}</button>
                  <button className="button-red" onClick={() => handleDeleteGroup(group._id)}>
                      {t("delete")}
                  </button>
                </div>
            </div>
        ))
        )}
        
        {editGroup && (
            <div className="user-management-card">
                <input 
                    type="text" 
                    value={editGroup.name} 
                    onChange={(e) => setEditGroup({ ...editGroup, name: e.target.value })} 
                />
                <Select
                    isMulti
                    options={permissionOptions}
                    value={editGroup.permissions.map(p => ({ value: p, label: p })).filter(Boolean)}
                    onChange={(selected) => setEditGroup({ 
                      ...editGroup, 
                      permissions: selected.map(p => p.value).filter(Boolean) // Entfernt leere Werte
                  })}
                />
                <button onClick={handleUpdateGroup}>{t("update_group")}</button>
            </div>
        )}


        <div className="group-management-card">
            <input 
                type="text" 
                placeholder={t("group_name")} 
                value={newGroup.name} 
                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })} 
            />
            <Select
                isMulti
                options={permissionOptions}
                value={newGroup.permissions.map(p => ({ value: p, label: p }))}
                onChange={(selected) => setNewGroup({ 
                    ...newGroup, 
                    permissions: selected.map(p => p.value) 
                })}
            />
            <Select
              isMulti
              options={users.map(user => ({ value: user._id, label: user.username }))}
              value={newGroup.members}
              onChange={(selected) => setNewGroup({ 
                ...newGroup, 
                members: selected
              })}
            />
            <button onClick={handleAddGroup}>{t("add_group")}</button>
        </div>

      </div>
    </div>
  );
};

export default AdminGroupManagement;
