import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Header.css";

export function Header({ showLogout = false }) {
  const navigate = useNavigate();
  const { logout, token } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      navigate("/", { replace: true });
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <header className="main-header">
      <div className="main-header__topline" />
      <div className="main-header__inner">
        <div className="main-header__brand">
          <div className="main-header__titles">
            <span className="main-header__eyebrow">Recruitment Candidate Portal</span>
            <h1>Chaudhary Charan Singh University, Meerut</h1>
          </div>
        </div>

        {showLogout && token && (
          <button
            className="main-header__logout"
            disabled={loggingOut}
            type="button"
            onClick={handleLogout}
          >
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        )}
      </div>
    </header>
  );
}
