// version 1
import React, { useState, useEffect } from "react";
import config from "../config/config.json";
import { useNavigate } from "react-router-dom";
import bcrypt from "bcryptjs"; // ✅ bcrypt importieren

const apiUrl = import.meta.env.VITE_APP_API_URL || "http://localhost:3001";
// Function to hash password using SHA-512
const hashPassword = async (password) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-512", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(byte => byte.toString(16).padStart(2, "0")).join("");
};

const Install = () => {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
/*         databaseType: import.meta.env.VITE_APP_DATABASE_TYPE,
        databaseHost: import.meta.env.VITE_APP_DATABASE_HOST,
        databaseUser: import.meta.env.VITE_APP_DATABASE_USER,
        databasePassword: import.meta.env.VITE_APP_DATABASE_PASSWORD,
        databaseName: import.meta.env.VITE_APP_DATABASE_NAME,
        adminUsername: import.meta.env.VITE_APP_ADMIN_USERNAME,
        adminPassword: await hashPassword(import.meta.env.VITE_APP_ADMIN_PASSWORD) */
    });

    const [message, setMessage] = useState("");

    useEffect(() => {
        const setFormDataWrapper = async () => {
            const hashedPassword = await hashPassword(import.meta.env.VITE_APP_ADMIN_PASSWORD)
            
            setFormData({
                databaseType: import.meta.env.VITE_APP_DATABASE_TYPE,
                databaseHost: import.meta.env.VITE_APP_DATABASE_HOST,
                databaseUser: import.meta.env.VITE_APP_DATABASE_USER,
                databasePassword: import.meta.env.VITE_APP_DATABASE_PASSWORD,
                databaseName: import.meta.env.VITE_APP_DATABASE_NAME,
                adminUsername: import.meta.env.VITE_APP_ADMIN_USERNAME,
                adminPassword: import.meta.env.VITE_APP_ADMIN_PASSWORD,
                hashedAdminPassword: hashedPassword
            });
        }

        setFormDataWrapper()
    }, []);

    const handleChange = async (e) => {
        if(e.target.name == "adminPassword") {
            const adminPassword = e.target.value
            const hashedAdminPassword = await hashPassword(adminPassword)
            setFormData({ ...formData, "hashedAdminPassword": hashedAdminPassword, "adminPassword": adminPassword});
        } 
        else {
            setFormData({ ...formData, [e.target.name]: e.target.value });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        try {
            delete formData.adminPassword
            const response = await fetch(`${apiUrl}/install`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "Content-Type, Authorization"
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (data.status === "success") {
                setMessage("Installation und Admin-Nutzer erfolgreich erstellt!");
                navigate("/");
            } else {
                setMessage(data.message || "Fehler bei der Installation.");
            }
        } catch (error) {
            setMessage("Fehler beim Senden der Installation: " + error.message);
            console.error("Fehlerdetails:", error);
        }
    };

    return (
        <div className="install-container">
            <form onSubmit={handleSubmit} className="install-box">
                <h2>Installation</h2>

                <label>Database Type</label>
                <input type="text" name="databaseType" value={formData.databaseType} onChange={handleChange} required />

                <label>Database Host</label>
                <input type="text" name="databaseHost" value={formData.databaseHost} onChange={handleChange} required />

                <label>Database User</label>
                <input type="text" name="databaseUser" value={formData.databaseUser} onChange={handleChange} required />

                <label>Database Password</label>
                <input type="password" name="databasePassword" value={formData.databasePassword} onChange={handleChange} />

                <label>Database Name</label>
                <input type="text" name="databaseName" value={formData.databaseName} onChange={handleChange} required />

                <h3>Admin-Benutzer erstellen</h3>
                <label>Admin Benutzername</label>
                <input type="text" name="adminUsername" value={formData.adminUsername} onChange={handleChange} required />

                <label>Admin Passwort</label>
                <input type="password" name="adminPassword" value={formData.adminPassword} onChange={(e) => handleChange(e)} required />

                <button type="submit">Installieren</button>
                {message && <p className="error-message">{message}</p>}
            </form>
        </div>
    );
};

export default Install;
