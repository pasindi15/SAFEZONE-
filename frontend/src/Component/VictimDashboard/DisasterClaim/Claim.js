import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Claim.css";
import { validateNIC, validatePhone, validateName, validateEmail, validateAddress } from "../utils/validation";

const CREATE_CLAIM_URL = "http://localhost:5000/damage";

export default function Claim() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    nic: "",
    countryCode: "+94",
    phoneDigits: "",
    phone: "",
    email: "",
    address: "",
    postalCode: "",
    damageType: "",
    estimatedLoss: "",
    description: "", // <-- optional field included in state
    occurredAt: "",
    currentLocation: "",
  });

  const [attachments, setAttachments] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverMsg, setServerMsg] = useState("");

  /* ---------------- Input Handler ---------------- */
  const setVal = (e) => {
    const { name, value } = e.target;

    setForm((f) => {
      const updated = { ...f, [name]: value };

      // Combine country code + digits into full phone
      if (name === "countryCode" || name === "phoneDigits") {
        updated.phone = `${updated.countryCode}${updated.phoneDigits}`;
      }

      return updated;
    });

    // Clear error as user types
    if (errors[name]) setErrors((er) => ({ ...er, [name]: "" }));
  };

  /* ---------------- Validation ---------------- */
  const validate = () => {
    const er = {};

    // Use enhanced validation functions
    const nameValidation = validateName(form.name);
    if (!nameValidation.isValid) er.name = nameValidation.error;
    
    const nicValidation = validateNIC(form.nic);
    if (!nicValidation.isValid) er.nic = nicValidation.error;
    
    const phoneValidation = validatePhone(form.phoneDigits);
    if (!phoneValidation.isValid) er.phoneDigits = phoneValidation.error;
    
    const emailValidation = validateEmail(form.email);
    if (!emailValidation.isValid) er.email = emailValidation.error;
    
    const addressValidation = validateAddress(form.address);
    if (!addressValidation.isValid) er.address = addressValidation.error;
    if (!/^\d{5}$/.test(form.postalCode.trim()))
      er.postalCode = "Postal code must be 5 digits.";
    if (!form.damageType) er.damageType = "Select a damage type.";
    if (form.estimatedLoss === "" || Number(form.estimatedLoss) < 0)
      er.estimatedLoss = "Enter estimated loss ≥ 0.";
    if (!form.occurredAt) er.occurredAt = "Select date & time of occurrence.";
    else {
      // Validate occurredAt date is not in the future
      const selectedDate = new Date(form.occurredAt);
      const now = new Date();
      // Add 1 minute buffer to account for submission time
      const bufferTime = new Date(now.getTime() + 60000);
      if (selectedDate > bufferTime) {
        er.occurredAt = "Please enter a real time (current time or time before current)";
      }
    }
    if (!form.currentLocation.trim())
      er.currentLocation = "Current location is required.";

    // NOTE: description is intentionally optional — no validation here

    return er;
  };

  const onBlurValidate = (field) => {
    const er = validate();
    if (er[field]) setErrors((old) => ({ ...old, [field]: er[field] }));
  };

  /* ---------------- Attachments ---------------- */
  const MAX_FILES = 5;
  const MAX_SIZE_MB = 25;

  const handleFiles = (filesList) => {
    const files = Array.from(filesList || []);
    const merged = [...attachments, ...files];
    const trimmed = merged.slice(0, MAX_FILES);
    const ok = trimmed.filter((f) => f.size <= MAX_SIZE_MB * 1024 * 1024);
    setAttachments(ok);
  };

  const removeFile = (idx) =>
    setAttachments((arr) => arr.filter((_, i) => i !== idx));

  /* ---------------- Geolocation ---------------- */
  const useMyLocation = () => {
    if (!("geolocation" in navigator)) {
      alert("Geolocation not supported in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setForm((f) => ({
          ...f,
          currentLocation: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        }));
        setErrors((er) => ({ ...er, currentLocation: "" }));
      },
      (err) => alert("Couldn't get location. You can type it manually."),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  /* ---------------- Submit Handler ---------------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerMsg("");
    const er = validate();
    setErrors(er);
    if (Object.keys(er).length) return;

    try {
      setSubmitting(true);
      const fd = new FormData();

      // append all form fields (including optional description)
      Object.entries(form).forEach(([k, v]) => {
        // ensure no undefined or null values break the form
        fd.append(k, v == null ? "" : v);
      });

      // append attachments
      attachments.forEach((file) => fd.append("attachments", file, file.name));

      const res = await axios.post(CREATE_CLAIM_URL, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert(res?.data?.message || "Claim submitted successfully!");

      // reset form (including optional description) & attachments & errors
      setForm({
        name: "",
        nic: "",
        countryCode: "+94",
        phoneDigits: "",
        phone: "",
        email: "",
        address: "",
        postalCode: "",
        damageType: "",
        estimatedLoss: "",
        description: "", // reset optional field
        occurredAt: "",
        currentLocation: "",
      });
      setAttachments([]);
      setErrors({});
      
      // Redirect to VictimDashboard
      navigate("/victim/dashboard");
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Error submitting claim.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="claim-page">
      <form className="claim-card" onSubmit={handleSubmit} noValidate>
        <div className="claim-header">
          <h1>Damage Claim</h1>
          <button type="button" className="btn-secondary back-btn" onClick={() => navigate('/victim/dashboard')}>
            ← Back
          </button>
        </div>

        {/* Name & NIC */}
        <div className="grid-2">
          <div className={`field ${errors.name ? "invalid" : ""}`}>
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="Enter your full name"
              value={form.name}
              onChange={setVal}
              onBlur={() => onBlurValidate("name")}
              required
            />
            {errors.name && <p className="error">{errors.name}</p>}
          </div>

          <div className={`field ${errors.nic ? "invalid" : ""}`}>
            <label htmlFor="nic">NIC</label>
            <input
              id="nic"
              name="nic"
              type="text"
              placeholder="Old: 123456789V / New: 200123456789"
              value={form.nic}
              onChange={setVal}
              onBlur={() => onBlurValidate("nic")}
              required
            />
            {errors.nic && <p className="error">{errors.nic}</p>}
          </div>
        </div>

        {/* Phone & Email */}
        <div className="field">
          <label>Phone</label>
          <div className="phone-row">
            <select
              name="countryCode"
              value={form.countryCode}
              onChange={setVal}
            >
              <option value="+94">+94 (Sri Lanka)</option>
              <option value="+1">+1 (USA/Canada)</option>
              <option value="+44">+44 (UK)</option>
              <option value="+91">+91 (India)</option>
              <option value="+86">+86 (China)</option>
              <option value="+81">+81 (Japan)</option>
              <option value="+65">+65 (Singapore)</option>
              <option value="+60">+60 (Malaysia)</option>
              <option value="+66">+66 (Thailand)</option>
              <option value="+880">+880 (Bangladesh)</option>
              <option value="+92">+92 (Pakistan)</option>
              <option value="+977">+977 (Nepal)</option>
              <option value="+33">+33 (France)</option>
              <option value="+49">+49 (Germany)</option>
              <option value="+61">+61 (Australia)</option>
            </select>
            <input
              name="phoneDigits"
              type="text"
              placeholder="7XXXXXXXX"
              value={form.phoneDigits}
              onChange={setVal}
              onBlur={() => onBlurValidate("phoneDigits")}
              className={errors.phoneDigits ? "is-invalid" : ""}
              required
            />
          </div>
          {errors.phoneDigits && (
            <small className="err-text">{errors.phoneDigits}</small>
          )}
        </div>

        {/* Email */}
        <div className={`field ${errors.email ? "invalid" : ""}`}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="example@mail.com"
            value={form.email}
            onChange={setVal}
            onBlur={() => onBlurValidate("email")}
            required
          />
          {errors.email && <p className="error">{errors.email}</p>}
        </div>

        {/* Address & Postal */}
        <div className="grid-2">
          <div className={`field ${errors.address ? "invalid" : ""}`}>
            <label htmlFor="address">Address</label>
            <input
              id="address"
              name="address"
              type="text"
              placeholder="Street address, city, etc."
              value={form.address}
              onChange={setVal}
              onBlur={() => onBlurValidate("address")}
              required
            />
            {errors.address && <p className="error">{errors.address}</p>}
          </div>

          <div className={`field ${errors.postalCode ? "invalid" : ""}`}>
            <label htmlFor="postalCode">Postal Code</label>
            <input
              id="postalCode"
              name="postalCode"
              type="text"
              placeholder="5-digit postal code"
              value={form.postalCode}
              onChange={setVal}
              onBlur={() => onBlurValidate("postalCode")}
              required
            />
            {errors.postalCode && <p className="error">{errors.postalCode}</p>}
          </div>
        </div>

        {/* Damage Type & Estimated Loss */}
        <div className="grid-2">
          <div className={`field ${errors.damageType ? "invalid" : ""}`}>
            <label htmlFor="damageType">Damage Type</label>
            <select
              id="damageType"
              name="damageType"
              value={form.damageType}
              onChange={setVal}
              onBlur={() => onBlurValidate("damageType")}
              required
            >
              <option value="">Select damage type</option>
              <option value="Flood">Flood</option>
              <option value="Earthquake">Earthquake</option>
              <option value="Landslide">Landslide</option>
              <option value="Storm / Cyclone">Storm / Cyclone</option>
              <option value="Fire">Fire</option>
              <option value="Drought">Drought</option>
              <option value="Accident">Accident</option>
              <option value="Other">Other</option>
            </select>
            {errors.damageType && <p className="error">{errors.damageType}</p>}
          </div>

          <div className={`field ${errors.estimatedLoss ? "invalid" : ""}`}>
            <label htmlFor="estimatedLoss">Estimated Loss (LKR)</label>
            <input
              id="estimatedLoss"
              name="estimatedLoss"
              type="number"
              min="0"
              placeholder="Estimated loss in LKR"
              value={form.estimatedLoss}
              onChange={setVal}
              onBlur={() => onBlurValidate("estimatedLoss")}
              required
            />
            {errors.estimatedLoss && (
              <p className="error">{errors.estimatedLoss}</p>
            )}
          </div>
        </div>

        {/* Description (Optional) */}
        <div className="field">
          <label htmlFor="description">Description (optional)</label>
          <textarea
            id="description"
            name="description"
            placeholder="Describe the damage (optional)"
            value={form.description}
            onChange={setVal}
            rows={4}
          />
          {/* intentionally no validation message — optional */}
        </div>

        {/* Occurred At & Current Location */}
        <div className="grid-2">
          <div className={`field ${errors.occurredAt ? "invalid" : ""}`}>
            <label htmlFor="occurredAt">Occurred At</label>
            <input
              id="occurredAt"
              name="occurredAt"
              type="datetime-local"
              value={form.occurredAt}
              onChange={setVal}
              onBlur={() => onBlurValidate("occurredAt")}
              max={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
              required
            />
            {errors.occurredAt && <p className="error">{errors.occurredAt}</p>}
          </div>

          <div className={`field ${errors.currentLocation ? "invalid" : ""}`}>
            <label htmlFor="currentLocation">Current Location</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                id="currentLocation"
                name="currentLocation"
                type="text"
                placeholder="Latitude,Longitude"
                value={form.currentLocation}
                onChange={setVal}
                onBlur={() => onBlurValidate("currentLocation")}
                required
                style={{ flex: 1 }}
              />
              <button type="button" onClick={useMyLocation}>
                📍
              </button>
            </div>
            {errors.currentLocation && (
              <p className="error">{errors.currentLocation}</p>
            )}
          </div>
        </div>

        {/* Attachments */}
        <div className="field">
          <label htmlFor="attachments">Attachments (max 5 files, 25MB each)</label>
          <input
            id="attachments"
            type="file"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
          />
          {attachments.length > 0 && (
            <ul>
              {attachments.map((file, idx) => (
                <li key={idx}>
                  {file.name}{" "}
                  <button type="button" onClick={() => removeFile(idx)}>
                    ❌
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Submit */}
        {serverMsg && <div className="server-msg">{serverMsg}</div>}
        <div className="actions">
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? "Submitting…" : "Submit Claim"}
          </button>
        </div>
      </form>
    </div>
  );
}
