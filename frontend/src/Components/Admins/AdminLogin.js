import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "../../api/axios";
import "./AdminLogin.css";

export default function AdminLogin() {
  const nav = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm((s) => ({ ...s, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await axios.post("/admin/login", form, { withCredentials: true });
      if (res.data?.ok) nav("/AdminHome");
      else setErr(res.data?.message || "Login failed");
    } catch (ex) {
      setErr(ex?.response?.data?.message || "Server error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="al-page">
      <div className="al-card">
        <div className="al-head">
          {/* Admin-only logo */}
          <div className="al-logo" aria-hidden>
            <svg viewBox="0 0 64 64" width="44" height="44" fill="none">
              <path d="M32 8l18 6v12c0 14-18 20-18 20S14 40 14 26V14l18-6Z" fill="#DBEAFE" stroke="#1E3A8A" strokeWidth="3"/>
              <circle cx="40" cy="24" r="6" fill="#DCFCE7" stroke="#065F46" strokeWidth="3"/>
              <path d="M36 24h8m-2 0v6" stroke="#065F46" strokeWidth="3" strokeLinecap="round"/>
              <path d="M20 42h8l4 6" stroke="#1E3A8A" strokeWidth="3" strokeLinecap="round"/>
            </svg>
          </div>
          <h2 className="al-title">Admin Login</h2>
          <p className="al-sub">Secure access to your dashboard</p>
        </div>

        {err && <p className="al-error" role="alert">{err}</p>}

        <form className="al-form" onSubmit={onSubmit} noValidate>
          <div className="al-field">
            <div className="al-input-wrap">
              <span className="al-left" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                  <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <input
                id="email"
                name="email"
                type="email"
                className="al-input has-left"
                value={form.email}
                onChange={onChange}
                placeholder=" "
                autoComplete="email"
                required
              />
              <span className="al-float">Email</span>
            </div>
          </div>

          <div className="al-field">
            <div className="al-input-wrap">
              <span className="al-left" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                  <rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 10V7a4 4 0 1 1 8 0v3" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </span>
              <input
                id="password"
                name="password"
                type={showPw ? "text" : "password"}
                className="al-input has-left has-right"
                value={form.password}
                onChange={onChange}
                placeholder=" "
                autoComplete="current-password"
                required
              />
              <span className="al-right">
                <button type="button" className="al-icon-btn" onClick={() => setShowPw((s) => !s)}>
                  {showPw ? "Hide" : "Show"}
                </button>
              </span>
              <span className="al-float">Password</span>
            </div>
          </div>

          <button type="submit" className="al-btn" disabled={loading}>
            {loading ? "Signing in…" : "Login"}
          </button>
        </form>

        <div className="al-foot">
          <small>
            No account?{" "}
            <Link className="al-link" to="/AdminHome/AdminRegitration">Register</Link>
          </small>
        </div>
      </div>
    </div>
  );
}
