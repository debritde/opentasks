import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import config from "../config/config.json";

const apiUrl = import.meta.env.VITE_APP_API_URL || "http://localhost:3001";

document.documentElement.setAttribute("data-theme", "dark");

// Function to hash password using SHA-512
const hashPassword = async (password) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-512", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(byte => byte.toString(16).padStart(2, "0")).join("");
};

const Login = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: "",
        password: "",
        twoFactorCode: ""
    });
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage("");

        try {
            // 🔹 Hash the password before sending
            const hashedPassword = await hashPassword(formData.password);

            const response = await fetch(`${apiUrl}/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username: formData.username,
                    passwordHash: hashedPassword, // ⬅️ Send hashed password
                    twoFactorCode: formData.twoFactorCode
                }),
            });

            const data = await response.json();

            if (data.status === "success") {
                localStorage.setItem("token", data.token);
                navigate("/");
            } else {
                setMessage(data.message || "Login fehlgeschlagen.");
            }
        } catch (error) {
            setMessage("Fehler beim Login: " + error.message);
        }
        setLoading(false);
    };

    return (
        <div className="login-container">
            <form onSubmit={handleSubmit} className="login-box">
                <h2>Login</h2>
                <input type="text" name="username" placeholder="Username" value={formData.username} onChange={handleChange} required />

                <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} required />

                <input type="text" name="twoFactorCode" placeholder="2FA Code (if activated)" value={formData.twoFactorCode} onChange={handleChange} />

                <button id="buttonLogin" type="submit" disabled={loading}>{loading ? "Lädt..." : "Anmelden"}</button>
                {message && <p className="error-message">{message}</p>}
            </form>
        </div>
    );
};

export default Login;
