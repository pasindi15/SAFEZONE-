// src/pages/Registation/Registation.jsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../api/axios";
import "./Registation.css";

const EMAIL_RX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
const PHONE_HINT = "+94XXXXXXXXX or 0XXXXXXXXX";
const phoneValid = (v) => /^\+94\d{9}$/.test(v) || /^0\d{9}$/.test(v);

const districts = [
  "Ampara","Anuradhapura","Badulla","Batticaloa","Colombo","Galle","Gampaha","Hambantota","Jaffna","Kalutara",
  "Kandy","Kegalle","Kilinochchi","Kurunegala","Mannar","Matale","Matara","Monaragala","Mullaitivu","Nuwara Eliya",
  "Polonnaruwa","Puttalam","Ratnapura","Trincomalee","Vavuniya"
];

const toE164LK = (v) => {
  if (!v) return v;
  const digits = v.replace(/[^\d]/g, "");
  if (v.trim().startsWith("+94")) {
    if (digits.startsWith("94") && digits.length === 11) return `+${digits}`;
    return null;
  }
  if (v.trim().startsWith("0")) {
    if (digits.length === 10) return `+94${digits.slice(1)}`;
    return null;
  }
  if (digits.length === 9) return `+94${digits}`;
  return null;
};

const validateEmail = (v) =>
  EMAIL_RX.test(v) ? "" : "Enter a valid email (e.g., name@example.com).";

const validatePhoneLK = (v) => {
  if (!v) return "Contact number is required.";
  const normalized = toE164LK(v);
  if (normalized && /^\+94\d{9}$/.test(normalized)) return "";
  if (v.trim().startsWith("+94")) return "Use +94 followed by 9 digits (e.g., +94712345678).";
  if (v.trim().startsWith("0")) return "Use a 10-digit number starting with 0 (e.g., 0712345678).";
  return "Start with +94… or 0… (e.g., +9471… or 071…).";
};

const validatePassword = (v) => {
  const len = v.length >= 8;
  const letter = /[A-Za-z]/.test(v);
  const number = /\d/.test(v);
  const special = /[^A-Za-z0-9]/.test(v);
  if (len && letter && number && special) return "";
  return "Password must be: ✅ 8+ chars 🔠 letter 🔢 number 🔣 special";
};

const validateConfirm = (pwd, cpwd) =>
  pwd === cpwd ? "" : "Passwords do not match.";

const scorePassword = (pw = "") => {
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(s, 4);
};

function Registation() {
  const navigate = useNavigate();

  const [user, setUser] = useState({
    firstName: "",
    lastName: "",
    nic: "",
    email: "",
    contactNumber: "",
    district: "",
    city: "",
    postalCode: "",
    password: "",
    confirmPassword: "",
  });

  const [touched, setTouched] = useState({});
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);

  const errors = useMemo(() => {
    const e = {};
    if (!user.firstName.trim()) e.firstName = "Required";
    if (!user.lastName.trim()) e.lastName = "Required";
    if (!user.nic.trim()) e.nic = "Required";
    if (!EMAIL_RX.test(user.email)) e.email = "Enter a valid email";
    if (!phoneValid(user.contactNumber)) e.contactNumber = `Use ${PHONE_HINT}`;
    if (!user.district) e.district = "Select a district";
    if (!user.city.trim()) e.city = "Required";
    if (!user.postalCode.trim()) e.postalCode = "Required";
    if (user.password.length < 8) e.password = "Min 8 characters";
    if (user.confirmPassword !== user.password) e.confirmPassword = "Passwords do not match";
    return e;
  }, [user]);

  const pwScore = scorePassword(user.password);
  const isValid = Object.keys(errors).length === 0;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUser((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhoneBlur = () => {
    const normalized = toE164LK(user.contactNumber);
    if (normalized) setUser((s) => ({ ...s, contactNumber: normalized }));
  };

  const formHasErrors =
    !!(
      errors.email ||
      errors.contactNumber ||
      errors.password ||
      errors.confirmPassword
    ) ||
    !user.email ||
    !user.contactNumber ||
    !user.password ||
    !user.confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();

    const finalErrors = {
      email: validateEmail(user.email),
      contactNumber: validatePhoneLK(user.contactNumber),
      password: validatePassword(user.password),
      confirmPassword: validateConfirm(user.password, user.confirmPassword),
    };
    const anyError = Object.values(finalErrors).some(Boolean);

    setTouched({
      firstName: true,
      lastName: true,
      nic: true,
      email: true,
      contactNumber: true,
      district: true,
      city: true,
      postalCode: true,
      password: true,
      confirmPassword: true,
    });
    if (anyError) return;

    const storedPhone = toE164LK(user.contactNumber);
    if (!storedPhone) {
      alert("Invalid phone. Expect +94 followed by 9 digits.");
      return;
    }

    try {
      await axios.post("/users", {
        firstName: user.firstName,
        lastName: user.lastName,
        nic: user.nic,
        email: user.email,
        contactNumber: storedPhone,
        district: user.district,
        city: user.city,
        postalCode: user.postalCode,
        password: user.password,
      });
      alert("Registration successful. You can log in now.");
      navigate("/UserLogin");
    } catch (err) {
      alert(err?.response?.data?.message || err.message);
    }
  };

  return (
    <div className="reg-page">
      <div className="reg-card">
        <div className="reg-header">
          <div className="reg-hero" aria-hidden>
            <svg viewBox="0 0 64 64" width="48" height="48" fill="none">
              <circle cx="24" cy="22" r="10" stroke="#1E3A8A" strokeWidth="3" fill="#E0EAFF"/>
              <path d="M6 48c2-8 10-13 18-13s16 5 18 13" stroke="#1E3A8A" strokeWidth="3" fill="#DBEAFE"/>
              <path d="M46 10l12 4v10c0 11-12 16-12 16s-12-5-12-16V14l12-4Z" fill="#DCFCE7" stroke="#065F46" strokeWidth="3"/>
              <path d="M46 20v8" stroke="#065F46" strokeWidth="3" strokeLinecap="round"/>
              <path d="M42 24h8" stroke="#065F46" strokeWidth="3" strokeLinecap="round"/>
            </svg>
          </div>
          <h1>SafeZone Registration</h1>
          <p className="subtitle">Create your account to stay safe & connected</p>
        </div>

        <form className="ar-form" onSubmit={handleSubmit} noValidate>
          <div className={`ar-field ${touched.firstName && errors.firstName ? "error" : ""} ${touched.firstName && !errors.firstName ? "success" : ""}`} data-key="firstName">
            <div className="ar-input-wrap">
              <span className="ar-left" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                  <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-5 0-9 2.5-9 5v1h18v-1c0-2.5-4-5-9-5Z" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </span>
              <input
                className="ar-input has-left"
                id="firstName"
                name="firstName"
                value={user.firstName}
                onChange={handleInputChange}
                onBlur={() => setTouched((t) => ({ ...t, firstName: true }))}
                placeholder=" "
                autoComplete="given-name"
              />
              <span className="ar-float">First Name</span>
            </div>
            {touched.firstName && errors.firstName && <div className="ar-error-text">{errors.firstName}</div>}
          </div>

          <div className={`ar-field ${touched.lastName && errors.lastName ? "error" : ""} ${touched.lastName && !errors.lastName ? "success" : ""}`} data-key="lastName">
            <div className="ar-input-wrap">
              <input
                className="ar-input"
                id="lastName"
                name="lastName"
                value={user.lastName}
                onChange={handleInputChange}
                onBlur={() => setTouched((t) => ({ ...t, lastName: true }))}
                placeholder=" "
                autoComplete="family-name"
              />
              <span className="ar-float">Last Name</span>
            </div>
            {touched.lastName && errors.lastName && <div className="ar-error-text">{errors.lastName}</div>}
          </div>

          <div className={`ar-field ${touched.nic && errors.nic ? "error" : ""} ${touched.nic && !errors.nic ? "success" : ""}`} data-key="nic">
            <div className="ar-input-wrap">
              <span className="ar-left" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                  <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <circle cx="9" cy="12" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M13.5 10h5m-5 4h3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </span>
              <input
                className="ar-input has-left"
                id="nic"
                name="nic"
                value={user.nic}
                onChange={handleInputChange}
                onBlur={() => setTouched((t) => ({ ...t, nic: true }))}
                placeholder=" "
                autoComplete="off"
              />
              <span className="ar-float">NIC</span>
            </div>
            {touched.nic && errors.nic && <div className="ar-error-text">{errors.nic}</div>}
          </div>

          <div className={`ar-field ${touched.email && errors.email ? "error" : ""} ${touched.email && !errors.email ? "success" : ""}`} data-key="email">
            <div className="ar-input-wrap">
              <span className="ar-left" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                  <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M4 7l8 6 8-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <input
                className="ar-input has-left"
                id="email"
                name="email"
                type="email"
                value={user.email}
                onChange={handleInputChange}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                placeholder=" "
                autoComplete="email"
              />
              <span className="ar-float">Email</span>
            </div>
            {touched.email && errors.email && <div className="ar-error-text">{errors.email}</div>}
          </div>

          <div className={`ar-field ${touched.contactNumber && errors.contactNumber ? "error" : ""} ${touched.contactNumber && !errors.contactNumber ? "success" : ""}`} data-key="contactNumber">
            <div className="ar-input-wrap">
              <span className="ar-left" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                  <path d="M6.6 10.8a15 15 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.1.33 2.3.52 3.5.52a1 1 0 0 1 1 1v3.25a1 1 0 0 1-1 1A18 18 0 0 1 3 6a1 1 0 0 1 1-1h3.25a1 1 0 0 1 1 1c0 1.2.19 2.4.52 3.5a1 1 0 0 1-.25 1l-2.92 2.3Z" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </span>
              <input
                className="ar-input has-left"
                id="contactNumber"
                name="contactNumber"
                value={user.contactNumber}
                onChange={handleInputChange}
                onBlur={() => { setTouched((t) => ({ ...t, contactNumber: true })); handlePhoneBlur(); }}
                placeholder=" "
                inputMode="tel"
                pattern="^(?:\+94\d{9}|0\d{9})$"
                autoComplete="tel"
              />
              <span className="ar-float">Contact Number ({PHONE_HINT})</span>
            </div>
            {touched.contactNumber && errors.contactNumber && <div className="ar-error-text">{errors.contactNumber}</div>}
          </div>

          <div className={`ar-field ${touched.district && errors.district ? "error" : ""} ${touched.district && !errors.district ? "success" : ""}`} data-key="district">
            <div className="ar-input-wrap">
              <span className="ar-left" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                  <path d="M12 21s7-4.5 7-10a7 7 0 1 0-14 0c0 5.5 7 10 7 10Z" stroke="currentColor" strokeWidth="1.5"/>
                  <circle cx="12" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </span>
              <select
                id="district"
                name="district"
                className={`ar-select ${user.district ? "has-value" : ""}`}
                value={user.district}
                onChange={handleInputChange}
                onBlur={() => setTouched((t) => ({ ...t, district: true }))}
              >
                <option value="" disabled hidden></option>
                {districts.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <span className="ar-float">District</span>
            </div>
            {touched.district && errors.district && <div className="ar-error-text">{errors.district}</div>}
          </div>

          <div className={`ar-field ${touched.city && errors.city ? "error" : ""} ${touched.city && !errors.city ? "success" : ""}`} data-key="city">
            <div className="ar-input-wrap">
              <span className="ar-left" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                  <path d="M12 21s7-4.5 7-10a7 7 0 1 0-14 0c0 5.5 7 10 7 10Z" stroke="currentColor" strokeWidth="1.5"/>
                  <circle cx="12" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </span>
              <input
                className="ar-input has-left"
                id="city"
                name="city"
                value={user.city}
                onChange={handleInputChange}
                onBlur={() => setTouched((t) => ({ ...t, city: true }))}
                placeholder=" "
                autoComplete="address-level2"
              />
              <span className="ar-float">City</span>
            </div>
            {touched.city && errors.city && <div className="ar-error-text">{errors.city}</div>}
          </div>

          <div className={`ar-field ${touched.postalCode && errors.postalCode ? "error" : ""} ${touched.postalCode && !errors.postalCode ? "success" : ""}`} data-key="postalCode">
            <div className="ar-input-wrap">
              <span className="ar-left" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                  <path d="M10 3L7 21m10-18-3 18M4 9h16M3 15h16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </span>
              <input
                className="ar-input has-left"
                id="postalCode"
                name="postalCode"
                value={user.postalCode}
                onChange={handleInputChange}
                onBlur={() => setTouched((t) => ({ ...t, postalCode: true }))}
                placeholder=" "
                inputMode="numeric"
                autoComplete="postal-code"
              />
              <span className="ar-float">Postal Code</span>
            </div>
            {touched.postalCode && errors.postalCode && <div className="ar-error-text">{errors.postalCode}</div>}
          </div>

          <div className={`ar-field ${touched.password && errors.password ? "error" : ""} ${touched.password && !errors.password ? "success" : ""}`} data-key="password">
            <div className="ar-input-wrap">
              <span className="ar-left" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                  <rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 10V7a4 4 0 1 1 8 0v3" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </span>
              <input
                className="ar-input has-left has-right"
                id="password"
                name="password"
                type={showPw ? "text" : "password"}
                value={user.password}
                onChange={handleInputChange}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                placeholder=" "
                autoComplete="new-password"
              />
              <span className="ar-right">
                <button type="button" className="ar-icon-btn" onClick={() => setShowPw((s) => !s)}>
                  {showPw ? "Hide" : "Show"}
                </button>
              </span>
              <span className="ar-float">Password (min 8 chars)</span>
            </div>
            <div className="ar-strength" data-score={pwScore}>
              <span></span><span></span><span></span><span></span>
            </div>
            {touched.password && errors.password && <div className="ar-error-text">{errors.password}</div>}
          </div>

          <div className={`ar-field ${touched.confirmPassword && errors.confirmPassword ? "error" : ""} ${touched.confirmPassword && !errors.confirmPassword ? "success" : ""}`} data-key="confirmPassword">
            <div className="ar-input-wrap">
              <span className="ar-left" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" width="18" height="18">
                  <rect x="4" y="10" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M8 10V7a4 4 0 1 1 8 0v3" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </span>
              <input
                className="ar-input has-left has-right"
                id="confirmPassword"
                name="confirmPassword"
                type={showCpw ? "text" : "password"}
                value={user.confirmPassword}
                onChange={handleInputChange}
                onBlur={() => setTouched((t) => ({ ...t, confirmPassword: true }))}
                placeholder=" "
                autoComplete="new-password"
              />
              <span className="ar-right">
                <button type="button" className="ar-icon-btn" onClick={() => setShowCpw((s) => !s)}>
                  {showCpw ? "Hide" : "Show"}
                </button>
              </span>
              <span className="ar-float">Confirm Password</span>
            </div>
            {touched.confirmPassword && errors.confirmPassword && <div className="ar-error-text">{errors.confirmPassword}</div>}
          </div>

          <button
            type="submit"
            className="ar-btn"
            disabled={formHasErrors || !isValid}
            title={formHasErrors || !isValid ? "Fix validation errors to continue" : ""}
          >
            Register
          </button>
        </form>

        <p className="login-link">
          Already have an account? <a href="/UserLogin">Log in</a>
        </p>
      </div>
    </div>
  );
}

export default Registation;
