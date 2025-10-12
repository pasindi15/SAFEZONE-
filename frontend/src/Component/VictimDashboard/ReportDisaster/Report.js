// src/Component/VictimDashboard/ReportDisaster/Report.js
// Main component for submitting disaster reports with media attachments

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./Report.css";
import { validateNIC, validatePhone, validateName, validateEmail, validateAddress } from "../utils/validation";

// Backend API endpoint for victim reports
const API = "http://localhost:5000/victims";

// Allowed file types for media uploads
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
];

// Validation regex patterns
const NIC_REGEX = /^(?:\d{12}|\d{9}[VX])$/; // 123456789V or 200012345678
const NAME_REGEX = /^[A-Za-z\s]+$/; // letters + spaces
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // simple email check
const LK_PHONE_DIGITS = /^[0-9]{9,10}$/; // 9-10 digits

// Helper function to create unique file keys for deduplication
const fileKey = (f) => `${f.name}-${f.size}-${f.lastModified}`;

export default function Report() {
  const navigate = useNavigate();

  // Form state management
  const [form, setForm] = useState({
    name: "",
    countryCode: "+94",
    phoneDigits: "",
    email: "",
    nic: "",
    address: "",
    disasterType: "",
    occurredAt: "",
    description: "",
    status: "Medium",
    media: [],
  });

  // Error state for form validation
  const [errors, setErrors] = useState({});
  
  // GPS coordinates state {lat, lng}
  const [coords, setCoords] = useState(null);

  // Format coordinates as string for display
  const locationStr = coords
    ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`
    : "";

  // Emergency contacts list (display only)
  const CONTACTS = useMemo(
    () => [
      { label: "Ambulance", number: "1990", subtitle: "Suwaseriya" },
      { label: "Police", number: "119" },
      { label: "Fire & Rescue", number: "110" },
      { label: "Disaster Mgmt", number: "117" },
    ],
    []
  );

  // Error handling functions
  function setError(name, msg) {
    setErrors((e) => ({ ...e, [name]: msg }));
  }
  function clearError(name) {
    setErrors((e) => {
      const { [name]: _, ...rest } = e;
      return rest;
    });
  }

  // Unified onChange handler for inputs and file uploads
  function onChange(e) {
    const { name, value, files } = e.target;

    // Handle file uploads
    if (files) {
      // Filter allowed file types
      const allowed = [...files].filter((f) => ALLOWED_TYPES.includes(f.type));
      if (files.length && !allowed.length) {
        alert(
          "Unsupported file type. Allowed: JPEG, PNG, WEBP, AVIF, MP4, MOV, WEBM."
        );
      }

      // Remove duplicate files based on name, size, and modification time
      const seen = new Set();
      const deduped = [];
      allowed.forEach((f) => {
        const k = fileKey(f);
        if (!seen.has(k)) {
          seen.add(k);
          deduped.push(f);
        }
      });

      // Limit to maximum 2 files
      setForm((f) => ({ ...f, media: deduped.slice(0, 2) }));
      return;
    }

    // Field-specific validation and updates
    if (name === "nic") {
      const v = (value || "").toUpperCase();
      setForm((f) => ({ ...f, nic: v }));
      if (!v) setError("nic", "NIC is required");
      else if (!NIC_REGEX.test(v)) setError("nic", "Use 123456789V or 200012345678");
      else clearError("nic");
      return;
    }

    if (name === "name") {
      const v = value;
      setForm((f) => ({ ...f, name: v }));
      if (!v) setError("name", "Reporter name is required");
      else if (!NAME_REGEX.test(v)) setError("name", "Letters and spaces only");
      else clearError("name");
      return;
    }

    if (name === "email") {
      const v = value.trim();
      setForm((f) => ({ ...f, email: v }));
      if (v && !EMAIL_REGEX.test(v)) setError("email", "Enter a valid email");
      else clearError("email");
      return;
    }

    if (name === "phoneDigits") {
      const v = value.replace(/[^\d]/g, ""); // keep digits only
      setForm((f) => ({ ...f, phoneDigits: v }));
      if (!v) setError("phone", "Phone is required");
      else if (!LK_PHONE_DIGITS.test(v)) setError("phone", "Enter 9–10 digits");
      else clearError("phone");
      return;
    }

    if (name === "address") {
      const v = value;
      setForm((f) => ({ ...f, address: v }));
      if (!v) setError("address", "Home address is required");
      else clearError("address");
      return;
    }

    if (name === "status") {
      const v = value;
      setForm((f) => ({ ...f, status: v }));
      if (!v) setError("status", "Status is required");
      else clearError("status");
      return;
    }

    if (name === "disasterType") {
      const v = value;
      setForm((f) => ({ ...f, disasterType: v }));
      if (!v) setError("disasterType", "Disaster type is required");
      else clearError("disasterType");
      return;
    }

    // Generic field update for other inputs
    setForm((f) => ({ ...f, [name]: value }));
  }

  // Get current GPS location using browser geolocation API
  function setCurrentLocation() {
    if (!navigator.geolocation) {
      alert("Geolocation not supported on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setCoords({ lat: coords.latitude, lng: coords.longitude });
        clearError("coords");
      },
      (err) => {
        console.error(err);
        setError("coords", "Could not get current location");
        alert("Unable to get current location.");
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  }

  // Status configuration for visual indicators
  const statusConfig = {
    High: { color: "#ef4444", bgColor: "#fef2f2", icon: "🔴", label: "High Risk" },
    Medium: { color: "#f59e0b", bgColor: "#fef3c7", icon: "🟡", label: "Medium Risk" },
    Low: { color: "#10b981", bgColor: "#d1fae5", icon: "🟢", label: "Low Risk" }
  };

  // Disaster type configuration for visual indicators
  const disasterTypeConfig = {
    Flood: { color: "#3b82f6", icon: "🌊" },
    Storm: { color: "#8b5cf6", icon: "⛈️" },
    Landslide: { color: "#f59e0b", icon: "🏔️" },
    Fire: { color: "#ef4444", icon: "🔥" },
    Earthquake: { color: "#6b7280", icon: "🌍" },
    Other: { color: "#6366f1", icon: "⚠️" }
  };

  // Validate all form fields before submission
  function validateAll() {
    let ok = true;
    setErrors({}); // reset errors first

    // Use enhanced validation functions
    const nameValidation = validateName(form.name);
    if (!nameValidation.isValid) {
      setError("name", nameValidation.error);
      ok = false;
    }

    const phoneValidation = validatePhone(form.phoneDigits);
    if (!phoneValidation.isValid) {
      setError("phone", phoneValidation.error);
      ok = false;
    }

    const nicValidation = validateNIC(form.nic);
    if (!nicValidation.isValid) {
      setError("nic", nicValidation.error);
      ok = false;
    }

    if (!form.status) {
      setError("status", "Status is required");
      ok = false;
    }
    if (!form.disasterType) {
      setError("disasterType", "Disaster type is required");
      ok = false;
    }
    const addressValidation = validateAddress(form.address);
    if (!addressValidation.isValid) {
      setError("address", addressValidation.error);
      ok = false;
    }

    const emailValidation = validateEmail(form.email);
    if (!emailValidation.isValid) {
      setError("email", emailValidation.error);
      ok = false;
    }

    if (!coords) {
      setError("coords", "Current location is required");
      ok = false;
    }

    // Validate occurredAt date is not in the future
    if (form.occurredAt) {
      const selectedDate = new Date(form.occurredAt);
      const now = new Date();
      // Add 1 minute buffer to account for submission time
      const bufferTime = new Date(now.getTime() + 60000);
      if (selectedDate > bufferTime) {
        setError("occurredAt", "Please enter a real time (current time or time before current)");
        ok = false;
      }
    }

    return ok;
  }

  // Helper function to normalize phone number for WhatsApp (digits only, no leading +)
  function normalizePhoneForWa(phoneStr) {
    return phoneStr.replace(/\D/g, "");
  }

  // Form submission handler
  async function onSubmit(e) {
    e.preventDefault();

    if (!validateAll()) return;

    // Prevent duplicate submissions
    const recentSubmissions = JSON.parse(localStorage.getItem('recentSubmissions') || '[]');
    const now = Date.now();
    const recentThreshold = 30000; // 30 seconds
    
    // Check for recent submissions with same NIC
    const recentSubmission = recentSubmissions.find(sub => 
      sub.nic === form.nic && (now - sub.timestamp) < recentThreshold
    );
    
    if (recentSubmission) {
      alert("Please wait before submitting another report with the same NIC.");
      return;
    }

    // Prepare form data for submission
    const nic = (form.nic || "").toUpperCase();
    const phone = `${form.countryCode}${form.phoneDigits}`; 

    const fd = new FormData();
    
    // Add basic form fields
    const basic = [
      ["name", form.name],
      ["phone", phone],
      ["email", form.email],
      ["nic", nic],
      ["address", form.address],
      ["disasterType", form.disasterType],
      ["occurredAt", form.occurredAt],
      ["description", form.description],
      ["status", form.status],
    ];
    basic.forEach(([k, v]) => {
      if (v !== undefined && v !== null && String(v).length) fd.append(k, v);
    });

    // Add location coordinates
    if (coords) {
      fd.append("lat", String(coords.lat));
      fd.append("lng", String(coords.lng));
      fd.append("locationStr", locationStr);
    }

    // Add media files
    form.media.forEach((file) => fd.append("media", file));

    try {
      // Submit form data to backend
      const { data } = await axios.post(API, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      // Store victim ID for auto-refresh functionality
      if (data?.victim?._id) {
        localStorage.setItem("lastVictimId", data.victim._id);
        localStorage.setItem("lastSubmissionId", data.victim._id);
      }

      // Record this submission to prevent duplicates
      recentSubmissions.push({
        nic: form.nic,
        timestamp: now,
        id: data?.victim?._id
      });
      
      // Keep only last 10 submissions
      const updatedSubmissions = recentSubmissions.slice(-10);
      localStorage.setItem('recentSubmissions', JSON.stringify(updatedSubmissions));

      // WhatsApp notification setup
      const adminNumber = "+94718940311";
      const disasterManager = "+94784732018";

      // Create notification message
      const plainMsg = [
        "🚨 NEW DISASTER REPORT 🚨",
        `Report ID: ${data?.victim?._id || 'N/A'}`,
        `Name: ${form.name}`,
        `Phone: ${phone}`,
        `NIC: ${nic}`,
        `Address: ${form.address}`,
        `Disaster: ${form.disasterType}`,
        `Status: ${form.status}`,
        `Occurred at: ${form.occurredAt || "N/A"}`,
        `Description: ${form.description || "N/A"}`,
        `Location: ${locationStr || "N/A"}`,
        `Time: ${new Date().toLocaleString()}`,
      ].join("\n");
      const msg = encodeURIComponent(plainMsg);

      // Determine recipients based on disaster status
      let recipients = [];
      let recipientType = "";
      
      if (form.status === "High") {
        recipients = [adminNumber];
        recipientType = "Admin";
      } else {
        recipients = [disasterManager];
        recipientType = "Disaster Manager";
      }

      // Send WhatsApp messages programmatically
      for (let i = 0; i < recipients.length; i++) {
        const num = recipients[i];
        const waUrl = `https://wa.me/${normalizePhoneForWa(num)}?text=${msg}`;
        
        // Create a hidden link and click it programmatically
        const link = document.createElement('a');
        link.href = waUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Small delay between messages
        if (i < recipients.length - 1) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }

      // Success alert and navigation
      setTimeout(() => {
        alert(`Successfully reported! WhatsApp notification sent to ${recipientType}.`);
        navigate("/victim/dashboard");
      }, 100);
    } catch (err) {
      console.error(err);
      alert("Failed to submit. Please try again.");
    }
  }

  // Create preview URLs for uploaded files
  const previews = useMemo(
    () => form.media.map((f) => ({ file: f, url: URL.createObjectURL(f) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.media]
  );
  
  // Cleanup preview URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      previews.forEach((p) => {
        try {
          URL.revokeObjectURL(p.url);
        } catch (e) {
          // ignore cleanup errors
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.media]);

  // Reset form to initial state
  function handleReset() {
    setForm({
      name: "",
      countryCode: "+94",
      phoneDigits: "",
      email: "",
      nic: "",
      address: "",
      disasterType: "",
      occurredAt: "",
      description: "",
      status: "Medium",
      media: [],
    });
    setErrors({});
    setCoords(null);
  }


  return (
    <main className="report container light-theme">
      {/* Page header with title and location controls */}
      <header className="page-head glass">
        <div className="page-title">
          <h1>Report Disaster</h1>
          <p className="muted">Report an incident with location and media to alert responders.</p>
        </div>

        <div className="head-actions">
          {/* Location status indicator */}
          <div
            className={"loc-chip" + (coords ? " on" : "")}
            title={coords ? "Current location set" : "Current location not set"}
          >
            <svg viewBox="0 0 24 24" className="loc-dot" aria-hidden>
              <circle cx="12" cy="12" r="6" />
            </svg>
            {coords ? `Current: ${locationStr}` : "Current location required"}
          </div>

          {/* GPS location button */}
          <button type="button" className="gps-btn start" onClick={setCurrentLocation} title="Use Current Location">
            <svg viewBox="0 0 24 24" className="gps-ico" aria-hidden>
              <path d="M12 8a4 4 0 1 0 .001 8.001A4 4 0 0 0 12 8zm0-6a1 1 0 0 1 1 1v2.06A7.002 7.002 0 0 1 19.94 11H22a1 1 0 1 1 0 2h-2.06A7.002 7.002 0 0 1 13 19.94V22a1 1 0 1 1-2 0v-2.06A7.002 7.002 0 0 1 4.06 13H2a1 1 0 1 1 0-2h2.06A7.002 7.002 0 0 1 11 4.06V2a1 1 0 0 1 1-1z" />
            </svg>
            <span>Use Current</span>
          </button>
        </div>
      </header>

      <section className="page-grid">
        {/* Main form section */}
        <form className="card form glass" onSubmit={onSubmit} noValidate>
          {/* Form header with status indicator */}
          <div className="form-header">
            <div className="form-title-section">
              <h2 className="form-title">🚨 Emergency Report Form</h2>
              <p className="form-subtitle">Fill out the details below to report a disaster incident</p>
            </div>
            <div className="header-actions">
              <button type="button" className="btn btn-ghost back-btn" onClick={() => navigate('/victim/dashboard')}>
                 Back
              </button>
              {/* Dynamic status indicator */}
              {form.status && (
                <div 
                  className="status-indicator"
                  style={{ 
                    backgroundColor: statusConfig[form.status]?.bgColor,
                    borderColor: statusConfig[form.status]?.color,
                    color: statusConfig[form.status]?.color
                  }}
                >
                  <span className="status-icon">{statusConfig[form.status]?.icon}</span>
                  <span className="status-label">{statusConfig[form.status]?.label}</span>
                </div>
              )}
            </div>
          </div>
          <div className="row two">
            <label>
              <span>Reporter name *</span>
              <input
                className={"input" + (errors.name ? " is-invalid" : "")}
                name="name"
                value={form.name}
                onChange={onChange}
                placeholder="e.g., Pasindi Alawatta"
                required
              />
              {errors.name && <small className="err-text">{errors.name}</small>}
            </label>

            <label>
              <span>Phone *</span>
              <div className="phone-row">
                <select
                  className="select code"
                  name="countryCode"
                  value={form.countryCode}
                  onChange={(e) => setForm((f) => ({ ...f, countryCode: e.target.value }))}
                >
                  <option value="+94">+94 (Sri Lanka)</option>
                  <option value="+1">+1 (USA/Canada)</option>
                  <option value="+44">+44 (UK)</option>
                  <option value="+91">+91 (India)</option>
                </select>
                <input
                  className={"input digits" + (errors.phone ? " is-invalid" : "")}
                  name="phoneDigits"
                  inputMode="numeric"
                  placeholder="7XXXXXXXX (9–10 digits)"
                  value={form.phoneDigits}
                  onChange={onChange}
                  required
                />
              </div>
              {errors.phone && <small className="err-text">{errors.phone}</small>}
            </label>
          </div>

          <div className="row two">
            <label>
              <span>Email (optional)</span>
              <input
                className={"input" + (errors.email ? " is-invalid" : "")}
                type="email"
                name="email"
                value={form.email}
                onChange={onChange}
                placeholder="name@example.com"
              />
              {errors.email && <small className="err-text">{errors.email}</small>}
            </label>

            <label>
              <span>NIC *</span>
              <input
                id="nic"
                name="nic"
                type="text"
                inputMode="numeric"
                placeholder="123456789V or 200012345678"
                value={form.nic}
                onChange={onChange}
                maxLength={12}
                autoComplete="off"
                className={"input" + (errors.nic ? " is-invalid" : "")}
                required
              />
              {errors.nic && <small className="err-text">{errors.nic}</small>}
            </label>
          </div>

          <div className="row two">
            <label>
              <span>Disaster type *</span>
              <div className="disaster-type-container">
                <select
                  className={"select" + (errors.disasterType ? " is-invalid" : "")}
                  name="disasterType"
                  value={form.disasterType}
                  onChange={onChange}
                  required
                >
                  <option value="">Select disaster type…</option>
                  <option>Flood</option>
                  <option>Storm</option>
                  <option>Landslide</option>
                  <option>Fire</option>
                  <option>Earthquake</option>
                  <option>Other</option>
                </select>
                {form.disasterType && disasterTypeConfig[form.disasterType] && (
                  <div 
                    className="disaster-type-indicator"
                    style={{ color: disasterTypeConfig[form.disasterType]?.color }}
                  >
                    <span className="disaster-icon">{disasterTypeConfig[form.disasterType]?.icon}</span>
                  </div>
                )}
              </div>
              {errors.disasterType && <small className="err-text">{errors.disasterType}</small>}
            </label>

            <label>
              <span>Status *</span>
              <select
                className={"select" + (errors.status ? " is-invalid" : "")}
                name="status"
                value={form.status}
                onChange={onChange}
                required
              >
                <option value="High">High Risk</option>
                <option value="Medium">Medium Risk</option>
                <option value="Low">Low Risk</option>
              </select>
              {errors.status && <small className="err-text">{errors.status}</small>}
            </label>
          </div>

          <div className="row two">
            <label>
              <span>Occurred at</span>
              <input 
                className={"input" + (errors.occurredAt ? " is-invalid" : "")}
                type="datetime-local" 
                name="occurredAt" 
                value={form.occurredAt} 
                onChange={onChange}
                max={new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)}
                onBlur={() => {
                  if (form.occurredAt) {
                    const selectedDate = new Date(form.occurredAt);
                    const now = new Date();
                    const bufferTime = new Date(now.getTime() + 60000);
                    if (selectedDate > bufferTime) {
                      setError("occurredAt", "Please enter a real time (current time or time before current)");
                    } else {
                      setError("occurredAt", "");
                    }
                  }
                }}
              />
              {errors.occurredAt && <small className="err-text">{errors.occurredAt}</small>}
            </label>
            <label>
              <span>Home address *</span>
              <input
                className={"input" + (errors.address ? " is-invalid" : "")}
                name="address"
                value={form.address}
                onChange={onChange}
                placeholder="Street / City"
                required
              />
              {errors.address && <small className="err-text">{errors.address}</small>}
            </label>
          </div>

          <div className="row">
            <label>
              <span>Description</span>
              <textarea className="textarea" name="description" value={form.description} onChange={onChange} placeholder="Briefly describe what happened…" />
            </label>
          </div>

          <div className="row">
            <label className="upload">
              <span>Attach media (images/videos)</span>
              <input
                type="file"
                name="media"
                multiple
                accept=".jpg,.jpeg,.png,.webp,.avif,.mp4,.mov,.webm"
                onChange={onChange}
              />
              {!!previews.length && (
                <div className="previews">
                  {previews.map((p, idx) => {
                    const isVid = /^video\//.test(p.file.type);
                    return isVid ? (
                      <video key={idx} src={p.url} className="preview-vid" controls />
                    ) : (
                      <img key={idx} src={p.url} alt="preview" className="preview-img" />
                    );
                  })}
                </div>      
              )}
            </label>
          </div>

          {/* Current location required */}
          <div className="row">
            <label>
              <span>Current location *</span>
              <div className="loc-row">
                <input
                  className={"input" + (errors.coords ? " is-invalid" : "")}
                  value={coords ? locationStr : ""}
                  readOnly
                  placeholder="Click 'Use Current' at the top to fill location"
                  required
                />
                <button type="button" className="btn btn-ghost" onClick={setCurrentLocation}>
                  Use Current
                </button>
              </div>
              {errors.coords && <small className="err-text">{errors.coords}</small>}
            </label>
          </div>

          <div className="actions">
            <button type="button" className="btn btn-ghost" onClick={handleReset}>
              Clear
            </button>
            <button type="submit" className="btn btn-primary">
              Submit Report
            </button>
          </div>

        </form>

        {/* Right sidebar: Emergency contacts and info */}
        <div className="right-col">
          {/* Emergency Response Information Panel */}
          <aside className="card glass emergency-info">
            <div className="emergency-header">
              <h3 className="emergency-title">🚨 Emergency Response</h3>
              <p className="emergency-subtitle">Quick access to emergency services</p>
            </div>
            
            {/* Response time indicator */}
            <div className="response-time-card">
              <div className="response-icon">⚡</div>
              <div className="response-info">
                <div className="response-label">Average Response Time</div>
                <div className="response-time">5-15 minutes</div>
              </div>
            </div>

            {/* Emergency contacts list */}
            <div className="contacts-section">
              <h4 className="contacts-title">Emergency Contacts</h4>
              <ul className="contact-list">
                {CONTACTS.map((c) => (
                  <li key={c.number} className="contact-item">
                    <div className="contact-left">
                      <div className="contact-label">{c.label}</div>
                      {c.subtitle && <div className="contact-sub">{c.subtitle}</div>}
                    </div>
                    <a className="contact-num" href={`tel:${c.number}`} title={`Call ${c.label}`}>
                      {c.number}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            
            {/* Emergency usage notes */}
            <div className="emergency-note">
              <p>📞 Tap any number to call immediately</p>
              <p>⚠️ Use only for genuine emergencies</p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
