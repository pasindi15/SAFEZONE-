// src/Component/VictimDashboard/ReportDisaster/EditReport.js
// Edit form component for modifying existing disaster reports

import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import axios from "axios";
import "./EditReport.css";
import { validateNIC, validatePhone, validateName, validateEmail } from "../utils/validation";

// Backend API endpoint
const API = "http://localhost:5000/victims";

// Allowed file types for media uploads
const ALLOWED = [
  "image/jpeg", "image/png", "image/webp", "image/avif",
  "video/mp4", "video/quicktime", "video/webm"
];

// Risk status options to match Report.js
const RISK_OPTIONS = ["High", "Medium", "Low"];

// Validation regex patterns
const NIC_REGEX = /^(?:\d{12}|\d{9}[VX])$/i;
const NAME_REGEX = /^[A-Za-z\s]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LK_PHONE_DIGITS = /^[0-9]{9,10}$/;

// Helper functions
const fileKey = (f) => `${f.name}-${f.size}-${f.lastModified}`;
const toUrl = (m) => {
  if (!m) return null;
  if (typeof m === "string" && /^https?:\/\//i.test(m)) return m;
  if (m.url && /^https?:\/\//i.test(m.url)) return m.url;
  return m.filename ? `http://localhost:5000/uploads/${m.filename}` : null;
};

// Extract coordinates from GeoJSON or plain lat/lng fields
function fromGeoOrFields(v) {
  if (v?.location?.type === "Point" && Array.isArray(v.location.coordinates)) {
    return {
      lat: String(v.location.coordinates[1] ?? ""),
      lng: String(v.location.coordinates[0] ?? "")
    };
  }
  return { lat: v?.lat != null ? String(v.lat) : "", lng: v?.lng != null ? String(v.lng) : "" };
}

// Split phone number into country code and digits
function splitPhone(full) {
  const raw = (full || "").replace(/\s+/g, "");
  if (raw.startsWith("+94")) return { countryCode: "+94", phoneDigits: raw.slice(3) };
  // fallback: try to detect a leading +
  const m = raw.match(/^\+(\d{1,3})(\d+)$/);
  if (m) return { countryCode: `+${m[1]}`, phoneDigits: m[2] };
  return { countryCode: "+94", phoneDigits: raw.replace(/[^\d]/g, "") };
}

// Map legacy status values to new risk-based statuses
function mapLegacyStatus(s) {
  const x = String(s || "").toLowerCase();
  if (/approved/.test(x)) return "Low";
  if (/rejected|deny/.test(x)) return "High";
  // pending / in-review -> medium by default
  return "Medium";
}

export default function EditReport() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Component state management
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [victim, setVictim] = useState(null);
  const [saving, setSaving] = useState(false);

  // Field validation errors
  const [fieldErr, setFieldErr] = useState({});

  // Local form state (aligned with Report.js)
  const [form, setForm] = useState({
    name: "",
    countryCode: "+94",
    phoneDigits: "",
    email: "",
    nic: "",
    address: "",
    description: "",
    status: "Medium",         // High | Medium | Low
    disasterType: "",
    occurredAt: "",           // datetime-local (YYYY-MM-DDTHH:mm)
    lat: "",
    lng: "",
    media: []                 // new files to upload (max 2)
  });

  // ----- Load record -----
  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const { data } = await axios.get(`${API}/${id}`);
        const v = data?.victim || data;
        setVictim(v);

        const { lat, lng } = fromGeoOrFields(v);
        const phoneParts = splitPhone(v.phone);

        // prefer risk statuses; map legacy workflow statuses if necessary
        const rawStatus = v.status || v.Status || "Medium";
        const normalizedStatus = RISK_OPTIONS.includes(rawStatus) ? rawStatus : mapLegacyStatus(rawStatus);

        setForm((f) => ({
          ...f,
          name: v.name || v.victimName || "",
          countryCode: phoneParts.countryCode,
          phoneDigits: phoneParts.phoneDigits,
          email: v.email || "",
          nic: (v.nic || "").toUpperCase(),
          address: v.address || "",
          description: v.description || "",
          status: normalizedStatus,
          disasterType: v.disasterType || "",
          occurredAt: v.occurredAt ? new Date(v.occurredAt).toISOString().slice(0, 16) : "",
          lat,
          lng,
          media: []
        }));
      } catch (e) {
        setErr(e?.response?.data?.message || e?.message || "Failed to load report");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // ----- Change & File Handlers -----
  function setError(name, msg) {
    setFieldErr((prev) => ({ ...prev, [name]: msg }));
  }
  function clearError(name) {
    setFieldErr((prev) => {
      const { [name]: _, ...rest } = prev;
      return rest;
    });
  }

  function onChange(e) {
    const { name, value, files } = e.target;
    if (!files) {
      // per-field validation
      if (name === "name") {
        const v = value;
        setForm((f) => ({ ...f, name: v }));
        const nameValidation = validateName(v);
        if (!nameValidation.isValid) setError("name", nameValidation.error);
        else clearError("name");
        return;
      }
      if (name === "email") {
        const v = value.trim();
        setForm((f) => ({ ...f, email: v }));
        const emailValidation = validateEmail(v);
        if (!emailValidation.isValid) setError("email", emailValidation.error);
        else clearError("email");
        return;
      }
      if (name === "nic") {
        const v = (value || "").toUpperCase();
        setForm((f) => ({ ...f, nic: v }));
        const nicValidation = validateNIC(v);
        if (!nicValidation.isValid) setError("nic", nicValidation.error);
        else clearError("nic");
        return;
      }
      if (name === "phoneDigits") {
        const v = value.replace(/[^\d]/g, "");
        setForm((f) => ({ ...f, phoneDigits: v }));
        const phoneValidation = validatePhone(v);
        if (!phoneValidation.isValid) setError("phone", phoneValidation.error);
        else clearError("phone");
        return;
      }
      if (name === "address") {
        const v = value;
        setForm((f) => ({ ...f, address: v }));
        if (!v.trim()) setError("address", "Home address is required");
        else clearError("address");
        return;
      }
      if (name === "status") {
        const v = value;
        setForm((f) => ({ ...f, status: v }));
        if (!RISK_OPTIONS.includes(v)) setError("status", "Invalid status");
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
      if (name === "lat" || name === "lng") {
        const v = value;
        setForm((f) => ({ ...f, [name]: v }));
        // validate when both present
        const nlat = Number(name === "lat" ? v : form.lat);
        const nlng = Number(name === "lng" ? v : form.lng);
        if (name === "lat" && v !== "" && (!Number.isFinite(nlat) || nlat < -90 || nlat > 90)) setError("lat", "Latitude must be between -90 and 90");
        else if (name === "lat") clearError("lat");
        if (name === "lng" && v !== "" && (!Number.isFinite(nlng) || nlng < -180 || nlng > 180)) setError("lng", "Longitude must be between -180 and 180");
        else if (name === "lng") clearError("lng");
        return;
      }

      // generic
      setForm((f) => ({ ...f, [name]: value }));
      return;
    }

    // files
    const allowed = [...files].filter((f) => ALLOWED.includes(f.type));
    if (files.length && !allowed.length) {
      setErr("Unsupported file type. Allowed: JPEG, PNG, WEBP, AVIF, MP4, MOV, WEBM.");
    }

    const seen = new Set();
    const deduped = [];
    allowed.forEach((f) => {
      const k = fileKey(f);
      if (!seen.has(k)) {
        seen.add(k);
        deduped.push(f);
      }
    });

    setForm((f) => ({ ...f, media: deduped.slice(0, 2) }));
  }

  // Previews for newly attached files
  const previews = useMemo(
    () => form.media.map((f) => ({ file: f, url: URL.createObjectURL(f) })),
    [form.media]
  );
  useEffect(() => () => previews.forEach((p) => URL.revokeObjectURL(p.url)), [previews]);

  // ----- Use Current location -----
  function setCurrentLocation() {
    if (!navigator.geolocation) {
      alert("Geolocation not supported on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const lat = coords.latitude.toFixed(6);
        const lng = coords.longitude.toFixed(6);
        setForm((f) => ({ ...f, lat, lng }));
        clearError("coords");
        clearError("lat");
        clearError("lng");
      },
      (e) => {
        console.error(e);
        setError("coords", "Could not get current location");
        alert("Unable to get current location.");
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
    );
  }

  // ----- Validation -----
  function validate() {
    const fe = {};

    if (!form.name?.trim()) fe.name = "Name is required";
    else if (!NAME_REGEX.test(form.name)) fe.name = "Letters and spaces only";

    if (!form.phoneDigits) fe.phone = "Phone is required";
    else if (!LK_PHONE_DIGITS.test(form.phoneDigits)) fe.phone = "Enter 9–10 digits";

    if (!form.nic) fe.nic = "NIC is required";
    else if (!NIC_REGEX.test(form.nic.toUpperCase())) fe.nic = "Use 123456789V or 200012345678";

    if (!form.status || !RISK_OPTIONS.includes(form.status)) fe.status = "Invalid status";
    if (!form.disasterType) fe.disasterType = "Disaster type is required";
    if (!form.address?.trim()) fe.address = "Home address is required";

    if (form.email && !EMAIL_REGEX.test(form.email)) fe.email = "Invalid email";

    // current location required (both lat & lng valid)
    const nlat = Number(form.lat);
    const nlng = Number(form.lng);
    if (!form.lat || !form.lng) {
      fe.coords = "Current location is required";
    } else {
      if (!Number.isFinite(nlat) || nlat < -90 || nlat > 90) fe.lat = "Latitude must be between -90 and 90";
      if (!Number.isFinite(nlng) || nlng < -180 || nlng > 180) fe.lng = "Longitude must be between -180 and 180";
    }

    // Validate occurredAt date is not in the future
    if (form.occurredAt) {
      const selectedDate = new Date(form.occurredAt);
      const now = new Date();
      // Add 1 minute buffer to account for submission time
      const bufferTime = new Date(now.getTime() + 60000);
      if (selectedDate > bufferTime) {
        fe.occurredAt = "Please enter a real time (current time or time before current)";
      }
    }

    setFieldErr(fe);
    return Object.keys(fe).length === 0;
  }

  // ----- Submit -----
  async function onSubmit(e) {
    e.preventDefault();
    setErr("");

    if (!validate()) {
      setErr("Please fix the highlighted fields.");
      return;
    }

    try {
      setSaving(true);
      const fd = new FormData();

      const phone = `${form.countryCode}${form.phoneDigits}`;
      const nic = (form.nic || "").toUpperCase();

      // append scalar fields
      [
        ["name", form.name],
        ["phone", phone],
        ["email", form.email],
        ["nic", nic],
        ["address", form.address],
        ["description", form.description],
        ["status", form.status],
        ["disasterType", form.disasterType],
        ["occurredAt", form.occurredAt]
      ].forEach(([k, v]) => {
        if (v !== "" && v !== null && v !== undefined) fd.append(k, v);
      });

      // lat/lng (required)
      fd.append("lat", String(Number(form.lat)));
      fd.append("lng", String(Number(form.lng)));

      // files
      form.media.forEach((file) => fd.append("media", file));

      await axios.put(`${API}/${id}`, fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      navigate("/victim/read");
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Update failed");
    } finally {
      setSaving(false);
    }
  }

  // ----- UI -----
  if (loading)
    return (
      <main className="edit-wrap container">
        <div className="edit-empty">Loading…</div>
      </main>
    );
  if (err && !victim)
    return (
      <main className="edit-wrap container">
        <div className="edit-error">{err}</div>
      </main>
    );
  if (!victim) return null;

  const existingMedia = Array.isArray(victim.media) ? victim.media : [];

  return (
    <main className="edit-wrap container">
      <header className="edit-head">
        <h1>Edit Report</h1>
        <div className="edit-actions">
          <button type="button" className="btn ghost" onClick={setCurrentLocation}>
            Use Current Location
          </button>
          <Link to="/victim/read" className="btn ghost">Back to list</Link>
        </div>
      </header>

      {err && victim && <div className="edit-error" style={{ marginTop: 12 }}>{err}</div>}

      <section className="edit-grid">
        <form className="card form" onSubmit={onSubmit} noValidate>
          <div className="row two">
            <label>
              <span>Reporter name *</span>
              <input
                className={"input" + (fieldErr.name ? " is-invalid" : "")}
                name="name"
                value={form.name}
                onChange={onChange}
                placeholder="e.g., Pasindi Alawatta"
                required
              />
              {fieldErr.name && <small className="field-error">{fieldErr.name}</small>}
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
                  <option value="+94">+94</option>
                </select>
                <input
                  className={"input digits" + (fieldErr.phone ? " is-invalid" : "")}
                  name="phoneDigits"
                  inputMode="numeric"
                  placeholder="7XXXXXXXX (9–10 digits)"
                  value={form.phoneDigits}
                  onChange={onChange}
                  required
                />
              </div>
              {fieldErr.phone && <small className="field-error">{fieldErr.phone}</small>}
            </label>
          </div>

          <div className="row two">
            <label>
              <span>Email (optional)</span>
              <input
                className={"input" + (fieldErr.email ? " is-invalid" : "")}
                type="email"
                name="email"
                value={form.email}
                onChange={onChange}
                placeholder="name@example.com"
              />
              {fieldErr.email && <small className="field-error">{fieldErr.email}</small>}
            </label>

            <label>
              <span>NIC *</span>
              <input
                className={"input" + (fieldErr.nic ? " is-invalid" : "")}
                type="text"
                name="nic"
                inputMode="numeric"
                value={form.nic}
                onChange={onChange}
                placeholder="123456789V or 200012345678"
                maxLength={12}
                required
              />
              {fieldErr.nic && <small className="field-error">{fieldErr.nic}</small>}
            </label>
          </div>

          <div className="row two">
            <label>
              <span>Status *</span>
              <select
                className={"select" + (fieldErr.status ? " is-invalid" : "")}
                name="status"
                value={form.status}
                onChange={onChange}
                required
              >
                {RISK_OPTIONS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              {fieldErr.status && <small className="field-error">{fieldErr.status}</small>}
            </label>

            <label>
              <span>Disaster type *</span>
              <select
                className={"select" + (fieldErr.disasterType ? " is-invalid" : "")}
                name="disasterType"
                value={form.disasterType}
                onChange={onChange}
                required
              >
                <option value="">Select…</option>
                <option>Flood</option><option>Storm</option><option>Landslide</option>
                <option>Fire</option><option>Earthquake</option><option>Other</option>
              </select>
              {fieldErr.disasterType && <small className="field-error">{fieldErr.disasterType}</small>}
            </label>
          </div>

          <div className="row two">
            <label>
              <span>Occurred at</span>
              <input
                className={"input" + (fieldErr.occurredAt ? " is-invalid" : "")}
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
                      setFieldErr(prev => ({ ...prev, occurredAt: "Please enter a real time (current time or time before current)" }));
                    } else {
                      setFieldErr(prev => ({ ...prev, occurredAt: "" }));
                    }
                  }
                }}
              />
              {fieldErr.occurredAt && <small className="err-text">{fieldErr.occurredAt}</small>}
            </label>
            <label>
              <span>Home address *</span>
              <input
                className={"input" + (fieldErr.address ? " is-invalid" : "")}
                name="address"
                value={form.address}
                onChange={onChange}
                placeholder="Street / City"
                required
              />
              {fieldErr.address && <small className="field-error">{fieldErr.address}</small>}
            </label>
          </div>

          <div className="row">
            <label>
              <span>Description</span>
              <textarea
                className="textarea"
                name="description"
                value={form.description}
                onChange={onChange}
                placeholder="Briefly describe what happened…"
              />
            </label>
          </div>

          <div className="row two">
            <label>
              <span>Latitude *</span>
              <input
                className={"input" + ((fieldErr.lat || fieldErr.coords) ? " is-invalid" : "")}
                name="lat"
                value={form.lat}
                onChange={onChange}
                placeholder="6.927079"
                required
              />
              {(fieldErr.lat || fieldErr.coords) && (
                <small className="field-error">{fieldErr.lat || fieldErr.coords}</small>
              )}
            </label>
            <label>
              <span>Longitude *</span>
              <input
                className={"input" + ((fieldErr.lng || fieldErr.coords) ? " is-invalid" : "")}
                name="lng"
                value={form.lng}
                onChange={onChange}
                placeholder="79.861244"
                required
              />
              {(fieldErr.lng || fieldErr.coords) && (
                <small className="field-error">{fieldErr.lng || fieldErr.coords}</small>
              )}
            </label>
          </div>

          <div className="row">
            <label className="upload">
              <span>Replace/Attach media </span>
              <input
                type="file"
                name="media"
                multiple
                accept=".jpg,.jpeg,.png,.webp,.avif,.mp4,.mov,.webm"
                onChange={onChange}
              />
              {!!previews.length && (
                <div className="previews">
                  {previews.map((p, i) => {
                    const isVid = /^video\//.test(p.file.type);
                    return isVid ? (
                      <video key={i} src={p.url} className="preview-vid" controls />
                    ) : (
                      <img key={i} src={p.url} alt="preview" className="preview-img" />
                    );
                  })}
                </div>
              )}
            </label>
          </div>

          <div className="actions">
            <button type="submit" className="btn primary" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>

        <aside className="card side">
          <h3 className="side-title">Current attachments</h3>
          {existingMedia.length ? (
            <div className="side-grid">
              {existingMedia.map((m, i) => {
                const url = toUrl(m);
                const type = m?.mimetype || url || "";
                const isImg = /image/i.test(type);
                const isVid = /video/i.test(type);
                return (
                  <a key={url || m.filename || i} href={url || "#"} target="_blank" rel="noreferrer">
                    {isImg ? (
                      <img src={url} alt="file" />
                    ) : isVid ? (
                      <video src={url} />
                    ) : (
                      <div className="doc">{m.filename || "file"}</div>
                    )}
                  </a>
                );
              })}
            </div>
          ) : (
            <p className="muted">No files attached.</p>
          )}
        </aside>
      </section>
    </main>
  );
}
