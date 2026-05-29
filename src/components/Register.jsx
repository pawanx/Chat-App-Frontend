import { useState } from "react";
import axios from "axios";
import "../styles/auth.css";

export default function Register({ setUser }) {
  const BASE_URL = "https://chat-app-backend-e81z.onrender.com";
  const [form, setForm] = useState({
    username: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
    setError("");
    setSuccess("");
  };

  const handleRegister = async () => {
    if (!form.username || !form.password) {
      setError("All fields are required");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const { data } = await axios.post(`${BASE_URL}/auth/register`, form);

      // store user + token (same as login)
      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("token", data.token);

      setSuccess("Registration successful.");

      setTimeout(() => {
        setUser(data.user);
      }, 800);
    } catch (error) {
      console.error(error);
      setError(error?.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <h2>Register</h2>
      {error && <p className="error-text">{error}</p>}
      {success && <p className="success-text">{success}</p>}
      <input
        type="text"
        name="username"
        placeholder="Username"
        value={form.username}
        onChange={handleChange}
      />

      <input
        type="password"
        name="password"
        placeholder="Password"
        value={form.password}
        onChange={handleChange}
      />

      <button onClick={handleRegister} disabled={loading}>
        {loading ? "Registering..." : "Register"}
      </button>
    </div>
  );
}
