import React, { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import "./Header.css";
import logo from "../Images/logo.jpg"; // your logo

const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:5000";

export default function Nav() {
  const navigate = useNavigate();

  // session
  const [user, setUser] = useState(null);

  useEffect(() => {
    let mounted = true;

    const tryFetch = async (path) => {
      try {
        const r = await fetch(`${API_BASE}${path}`, { credentials: "include" });
        if (!r.ok) return null;
        return await r.json();
      } catch {
        return null;
      }
    };

    const fetchMe = async () => {
      // Prefer /users/me (user session), fall back to /auth/me (unified)
      let data = await tryFetch("/users/me");
      if (!data) data = await tryFetch("/auth/me");

      const foundUser = data?.user || (data?.role === "user" ? data.user : null);
      if (mounted) setUser(foundUser || null);
    };

    fetchMe();

    const onAuthChange = () => fetchMe();
    window.addEventListener("auth:login", onAuthChange);
    window.addEventListener("auth:logout", onAuthChange);

    return () => {
      mounted = false;
      window.removeEventListener("auth:login", onAuthChange);
      window.removeEventListener("auth:logout", onAuthChange);
    };
  }, []);

  const onLogout = async () => {
    try {
      await fetch(`${API_BASE}/users/logout`, {
        method: "POST",
        credentials: "include",
      });
      setUser(null);
      navigate("/");
      window.location.reload();
    } catch {
      setUser(null);
      navigate("/");
      window.location.reload();
    }
  };

  // dropdown
  const [menuOpen, setMenuOpen] = useState(false);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const toggleMenu = () => setMenuOpen((v) => !v);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!menuOpen) return;
      if (
        menuRef.current &&
        btnRef.current &&
        !menuRef.current.contains(e.target) &&
        !btnRef.current.contains(e.target)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, [menuOpen]);

  return (
    <>
      {/* Fixed user header */}
      <header className="sz-nav sz-nav-glass">
        <div className="sz-container sz-nav-inner">
          {/* Brand */}
          <Link to="/" className="sz-brand" aria-label="SafeZone Home">
            <img className="sz-logo-img" src={logo} alt="SafeZone logo" />
            <span className="sz-brand-text">SafeZone</span>
          </Link>

          {/* Links */}
          <nav className="sz-links">
            <NavLink to="/" className="sz-link" end>Home</NavLink>
            <NavLink to="/victim/dashboard" className="sz-link">Victim Dashboard</NavLink>
            <NavLink to="/UserAlerts" className="sz-link">Alerts</NavLink>
            <NavLink to="/contact" className="sz-link">Contact Us</NavLink>

            {!user ? (
              <>
                <Link to="/Registration" className="sz-btn sz-btn-primary">Register</Link>
                <Link to="/UserLogin" className="sz-btn sz-btn-outline">Login</Link>
              </>
            ) : (
              <div className="sz-user-block">
                <button
                  ref={btnRef}
                  className="sz-user-btn"
                  onClick={toggleMenu}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                >
                  <div className="sz-avatar sz-avatar-ring">
                    {user.firstName?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <span className="sz-hello">Hi, {user.firstName}</span>
                  <svg
                    className={`sz-caret ${menuOpen ? "open" : ""}`}
                    width="16" height="16" viewBox="0 0 24 24"
                  >
                    <path fill="currentColor" d="M7 10l5 5 5-5z" />
                  </svg>
                </button>

                {menuOpen && (
                  <div ref={menuRef} className="sz-user-menu" role="menu" aria-label="User menu">
                    <div className="sz-user-meta">
                      <div className="sz-avatar large sz-avatar-ring">
                        {user.firstName?.charAt(0)?.toUpperCase() || "U"}
                      </div>
                      <div>
                        <div className="sz-user-name">{user.firstName} {user.lastName}</div>
                        <div className="sz-user-sub">{user.email}</div>
                      </div>
                    </div>

                    <Link to="/dashboard" className="sz-menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>
                      Dashboard
                    </Link>
                    <Link to="/map" className="sz-menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>
                      Map
                    </Link>
                    <Link to="/user-map" className="sz-menu-item" role="menuitem" onClick={() => setMenuOpen(false)}>
                      My Map
                    </Link>

                    <button className="sz-menu-item danger" role="menuitem" onClick={onLogout}>
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </nav>
        </div>
      </header>

      {/* Spacer to push page content below fixed header (user side only) */}
      <div className="sz-header-spacer" aria-hidden="true" />
    </>
  );
}
