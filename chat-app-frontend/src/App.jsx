import { useState } from "react";
import Chat from "./pages/Chat";
import Register from "./components/Register";
import Login from "./components/Login";
import "../src/App.css";
import { socket } from "./pages/Chat";

function App() {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("user");
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      return null;
    }
  });

  const [isLogin, setIsLogin] = useState(true);

  // Logout handler
  const handleLogout = () => {
    socket.disconnect();
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Chat App</h1>

        {user && (
          <div className="user-info">
            <span className="username">Welcome, {user.username}</span>

            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        )}
      </header>

      {/* NOT logged in */}
      {!user ? (
        <div className="auth-container">
          <div className="auth-card-wrapper">
            <div className={`auth-switch ${isLogin ? "login" : "register"}`}>
              <button
                className={isLogin ? "active" : ""}
                onClick={() => setIsLogin(true)}
              >
                Login
              </button>

              <button
                className={!isLogin ? "active" : ""}
                onClick={() => setIsLogin(false)}
              >
                Register
              </button>
            </div>
            {isLogin ? (
              <Login setUser={setUser} />
            ) : (
              <Register setUser={setUser} />
            )}
          </div>
        </div>
      ) : (
        /* Logged in */
        <div className="chat-wrapper">
          <Chat user={user} />
        </div>
      )}
    </div>
  );
}

export default App;
