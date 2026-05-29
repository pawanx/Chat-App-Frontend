import { useState } from "react";
import axios from "axios";
import "../styles/auth.css";

export default function Login({ setUser }) {
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
  };

  const handleLogin = async () => {
    if (!form.username || !form.password) {
      setError("All fields are required");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const { data } = await axios.post(`${BASE_URL}/auth/login`, form);

      localStorage.setItem("user", JSON.stringify(data.user));
      localStorage.setItem("token", data.token);
      setSuccess("Login successful");

      setTimeout(() => {
        setUser(data.user); // move after success display
      }, 800);
    } catch (error) {
      console.error(error);
      setError(error?.response?.data?.message || "Login failed"); //  server error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <h2>Login</h2>
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

      <button onClick={handleLogin} disabled={loading}>
        {loading ? "Logging in..." : "Login"}
      </button>
    </div>
  );
}
