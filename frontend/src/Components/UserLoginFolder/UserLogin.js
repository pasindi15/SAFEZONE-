// src/pages/UserLogin/UserLogin.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "../../api/axios";
import Nav from "../../HeaderFotter/Header";
import "./UserLogin.css";

export default function UserLogin() {
  const navigate = useNavigate();

  const [user, setUser] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const [showPw, setShowPw] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUser((prev) => ({ ...prev, [name]: value }));
    if (errMsg) setErrMsg("");
  };

  const sendRequest = async () => {
    const res = await axios.post(
      "/users/login",
      {
        email: (user.email || "").toLowerCase().trim(),
        password: user.password || "",
      }
    );
    return res.data;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrMsg("");

    if (!user.email || !user.password) {
      setErrMsg("Please enter both email and password.");
      return;
    }

    setLoading(true);
    try {
      const data = await sendRequest();

      const ok =
        data?.status === "ok" ||
        data?.success === true ||
        Boolean(data?.token) ||
        Boolean(data?.user);

      if (!ok) {
        throw new Error(
          data?.message || data?.error || data?.err || "Invalid email or password"
        );
      }

      // Optional local cache if you use it elsewhere
      if (data?.token) localStorage.setItem("token", data.token);
      if (data?.user) localStorage.setItem("user", JSON.stringify(data.user));

      // Confirm the session cookie is live
      await axios.get("/auth/me");

      // Navigate to Home and hard refresh so Header re-runs its /auth/me
      navigate("/Home");
      window.location.reload();
    } catch (err) {
      const status = err?.response?.status;
      const serverMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.response?.data?.err;

      let message = "Login error";
      if (status === 404) message = serverMsg || "404 Not Found – User does not exist.";
      else if (status === 400 || status === 401) message = serverMsg || "Invalid email or password.";
      else if (status === 500) message = serverMsg || "Server error. Please try again.";
      else if (err?.code === "ECONNABORTED") message = "Request timed out. Check your connection.";
      else if (err?.message === "Network Error" || !err?.response) message = "Network error. Is the server running?";
      else message = serverMsg || err?.message || "Login error";

      setErrMsg(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Nav />

      <div className="sz-login">
        <div className="sz-card">
          <h1 className="sz-title">User Login</h1>

          <form onSubmit={handleSubmit} className="sz-form" noValidate>
            <label htmlFor="email" className="sz-label">Email</label>
            <input
              id="email"
              className="sz-input"
              type="email"
              name="email"
              value={user.email}
              onChange={handleInputChange}
              placeholder="Enter your Email"
              autoComplete="email"
              required
            />

            <label htmlFor="password" className="sz-label">Password</label>
            <div className="sz-input-wrap">
              <input
                id="password"
                className="sz-input"
                type={showPw ? "text" : "password"}
                name="password"
                value={user.password}
                onChange={handleInputChange}
                placeholder="Enter your Password"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="sz-show-btn"
                onClick={() => setShowPw((s) => !s)}
                aria-label={showPw ? "Hide password" : "Show password"}
              >
                {showPw ? "Hide" : "Show"}
              </button>
            </div>

            {errMsg ? <div className="sz-error">{errMsg}</div> : null}

            <button type="submit" disabled={loading} className="sz-btn">
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <div className="sz-actions">
            <Link to="/Registation">Create an account</Link>
          </div>
        </div>
      </div>
    </>
  );
}
