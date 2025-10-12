// src/Component/VictimDashboard/ReportDisaster/EditVictimProfile.js
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import "./VictimProfile.css";
import { validateNIC, validatePhone, validateName, validateEmail } from "../utils/validation";

const API = "http://localhost:5000/victims";
const ALLOWED = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
];

// Helpers
function splitPhone(full) {
  const raw = (full || "").replace(/\s+/g, "");
  if (raw.startsWith("+94"))
    return { countryCode: "+94", phoneDigits: raw.slice(3) };
  const m = raw.match(/^\+(\d{1,3})(\d+)$/);
  if (m) return { countryCode: `+${m[1]}`, phoneDigits: m[2] };
  return { countryCode: "+94", phoneDigits: raw.replace(/[^\d]/g, "") };
}
function fromGeo(v) {
  if (v?.location?.type === "Point" && Array.isArray(v.location.coordinates)) {
    return {
      lat: String(v.location.coordinates[1] ?? ""),
      lng: String(v.location.coordinates[0] ?? ""),
    };
  }
  return {
    lat: v?.lat != null ? String(v.lat) : "",
    lng: v?.lng != null ? String(v.lng) : "",
  };
}

export default function EditVictimProfile() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [victim, setVictim] = useState(null);
  const [err, setErr] = useState("");

  const [form, setForm] = useState({
    name: "",
    countryCode: "+94",
    phoneDigits: "",
    email: "",
    nic: "",
    address: "",
    description: "",
    status: "Medium", // High | Medium | Low
    disasterType: "",
    occurredAt: "",
    lat: "",
    lng: "",
    media: [], // new files (max 2)
    remove: [], // filenames to delete
  });

  const [fieldErr, setFieldErr] = useState({});

  // Load victim
  useEffect(() => {
    (async () => {
      try {
        const { data } = await axios.get(`${API}/${id}`);
        const v = data?.victim || data;
        setVictim(v);

        const { countryCode, phoneDigits } = splitPhone(v.phone);
        const { lat, lng } = fromGeo(v);

        setForm((s) => ({
          ...s,
          name: v.name || v.victimName || "",
          countryCode,
          phoneDigits,
          email: v.email || "",
          nic: (v.nic || "").toUpperCase(),
          address: v.address || "",
          description: v.description || "",
          status: v.status || "Medium",
          disasterType: v.disasterType || "",
          occurredAt: v.occurredAt
            ? new Date(v.occurredAt).toISOString().slice(0, 16)
            : "",
          lat,
          lng,
        }));
      } catch (e) {
        setErr(e?.response?.data?.message || "Error fetching victim");
      }
    })();
  }, [id]);

  // Change handlers + per-field validation
  function setError(name, msg) {
    setFieldErr((f) => ({ ...f, [name]: msg }));
  }
  function clearError(name) {
    setFieldErr((f) => {
      const { [name]: _, ...rest } = f;
      return rest;
    });
  }

  function onChange(e) {
    const { name, value, files } = e.target;

    // File inputs
    if (files) {
      const list = [...files]
        .filter((f) => ALLOWED.includes(f.type))
        .slice(0, 2);
      setForm((s) => ({ ...s, media: list }));
      return;
    }

    // Field-specific checks
    if (name === "name") {
      const v = value;
      setForm((s) => ({ ...s, name: v }));
      const nameValidation = validateName(v);
      if (!nameValidation.isValid) setError("name", nameValidation.error);
      else clearError("name");
      return;
    }

    if (name === "email") {
      const v = value.trim();
      setForm((s) => ({ ...s, email: v }));
      const emailValidation = validateEmail(v);
      if (!emailValidation.isValid) setError("email", emailValidation.error);
      else clearError("email");
      return;
    }

    if (name === "nic") {
      const v = (value || "").toUpperCase();
      setForm((s) => ({ ...s, nic: v }));
      const nicValidation = validateNIC(v);
      if (!nicValidation.isValid) setError("nic", nicValidation.error);
      else clearError("nic");
      return;
    }

    if (name === "phoneDigits") {
      const v = value.replace(/[^\d]/g, "");
      setForm((s) => ({ ...s, phoneDigits: v }));
      const phoneValidation = validatePhone(v);
      if (!phoneValidation.isValid) setError("phone", phoneValidation.error);
      else clearError("phone");
      return;
    }

    if (name === "address") {
      const v = value;
      setForm((s) => ({ ...s, address: v }));
      if (!v.trim()) setError("address", "Home address is required");
      else clearError("address");
      return;
    }

    if (name === "status") {
      const v = value;
      setForm((s) => ({ ...s, status: v }));
      if (!["High", "Medium", "Low"].includes(v))
        setError("status", "Invalid status");
      else clearError("status");
      return;
    }

    if (name === "disasterType") {
      const v = value;
      setForm((s) => ({ ...s, disasterType: v }));
      if (!v) setError("disasterType", "Disaster type is required");
      else clearError("disasterType");
      return;
    }

    if (name === "lat" || name === "lng") {
      const v = value;
      setForm((s) => ({ ...s, [name]: v }));
      const nlat = Number(name === "lat" ? v : form.lat);
      const nlng = Number(name === "lng" ? v : form.lng);
      if (name === "lat") {
        if (v === "" || !Number.isFinite(nlat) || nlat < -90 || nlat > 90)
          setError("lat", "Latitude -90 to 90");
        else clearError("lat");
      } else {
        if (v === "" || !Number.isFinite(nlng) || nlng < -180 || nlng > 180)
          setError("lng", "Longitude -180 to 180");
        else clearError("lng");
      }
      return;
    }

    // Generic fallback
    setForm((s) => ({ ...s, [name]: value }));
  }

  function toggleRemove(filename, checked) {
    setForm((s) => {
      const set = new Set(s.remove);
      checked ? set.add(filename) : set.delete(filename);
      return { ...s, remove: [...set] };
    });
  }

  function useMyLocation() {
    if (!navigator.geolocation) return alert("Geolocation not supported.");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const lat = coords.latitude.toFixed(6);
        const lng = coords.longitude.toFixed(6);
        setForm((s) => ({ ...s, lat, lng }));
        clearError("lat");
        clearError("lng");
        clearError("coords");
      },
      () => alert("Failed to get location"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  // Previews
  const previews = useMemo(
    () => form.media.map((f) => ({ file: f, url: URL.createObjectURL(f) })),
    [form.media]
  );
  useEffect(
    () => () => previews.forEach((p) => URL.revokeObjectURL(p.url)),
    [previews]
  );

  // Validate all before submit
  function validateAll() {
    let ok = true;

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

    if (!form.status || !["High", "Medium", "Low"].includes(form.status)) {
      setError("status", "Invalid status");
      ok = false;
    }
    if (!form.disasterType) {
      setError("disasterType", "Disaster type is required");
      ok = false;
    }
    if (!form.address?.trim()) {
      setError("address", "Home address is required");
      ok = false;
    }

    const emailValidation = validateEmail(form.email);
    if (!emailValidation.isValid) {
      setError("email", emailValidation.error);
      ok = false;
    }

    const nlat = Number(form.lat),
      nlng = Number(form.lng);
    if (!form.lat || !form.lng) {
      setError("coords", "Current location is required");
      ok = false;
    } else {
      if (!Number.isFinite(nlat) || nlat < -90 || nlat > 90) {
        setError("lat", "Latitude -90 to 90");
        ok = false;
      }
      if (!Number.isFinite(nlng) || nlng < -180 || nlng > 180) {
        setError("lng", "Longitude -180 to 180");
        ok = false;
      }
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

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setFieldErr({}); // reset visible errors

    if (!validateAll()) {
      setErr("Please fix the highlighted fields.");
      return;
    }

    try {
      const fd = new FormData();

      const phone = `${form.countryCode}${form.phoneDigits}`;
      const nic = (form.nic || "").toUpperCase();

      [
        ["name", form.name],
        ["phone", phone],
        ["email", form.email],
        ["nic", nic],
        ["address", form.address],
        ["description", form.description],
        ["status", form.status],
        ["disasterType", form.disasterType],
        ["occurredAt", form.occurredAt],
      ].forEach(([k, v]) => {
        if (v !== "" && v !== null && v !== undefined) fd.append(k, v);
      });

      // lat/lng are required here
      fd.append("lat", form.lat);
      fd.append("lng", form.lng);

      if (form.remove.length) fd.append("remove", JSON.stringify(form.remove));
      form.media.forEach((file) => fd.append("media", file));

      await axios.put(`${API}/${id}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      alert("Profile updated");
      navigate(`/victim/profile/${id}`);
    } catch (e) {
      alert(e?.response?.data?.message || "Update failed");
    }
  }

  if (err) return <div className="banner error">{err}</div>;
  if (!victim) return <div className="banner">Loading…</div>;

  return (
    <main className="profile container">
      <header className="profile-head">
        <h1>Edit Profile</h1>
        <div className="actions">
          <Link to={`/victim/profile/${id}`} className="btn ghost">
            Cancel
          </Link>
        </div>
      </header>

      <section className="profile-grid">
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
              {fieldErr.name && (
                <small className="field-error">{fieldErr.name}</small>
              )}
            </label>

            <label>
              <span>Phone *</span>
              <div className="phone-row">
                <select
                  className="select code"
                  name="countryCode"
                  value={form.countryCode}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, countryCode: e.target.value }))
                  }
                >
                  <option value="+94">+94</option>
                </select>
                <input
                  className={
                    "input digits" + (fieldErr.phone ? " is-invalid" : "")
                  }
                  name="phoneDigits"
                  inputMode="numeric"
                  placeholder="7XXXXXXXX (9–10 digits)"
                  value={form.phoneDigits}
                  onChange={onChange}
                  required
                />
              </div>
              {fieldErr.phone && (
                <small className="field-error">{fieldErr.phone}</small>
              )}
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
              {fieldErr.email && (
                <small className="field-error">{fieldErr.email}</small>
              )}
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
              {fieldErr.nic && (
                <small className="field-error">{fieldErr.nic}</small>
              )}
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
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
              {fieldErr.status && (
                <small className="field-error">{fieldErr.status}</small>
              )}
            </label>

            <label>
              <span>Disaster type *</span>
              <select
                className={
                  "select" + (fieldErr.disasterType ? " is-invalid" : "")
                }
                name="disasterType"
                value={form.disasterType}
                onChange={onChange}
                required
              >
                <option value="">Select…</option>
                <option>Flood</option>
                <option>Storm</option>
                <option>Landslide</option>
                <option>Fire</option>
                <option>Earthquake</option>
                <option>Other</option>
              </select>
              {fieldErr.disasterType && (
                <small className="field-error">{fieldErr.disasterType}</small>
              )}
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
              {fieldErr.address && (
                <small className="field-error">{fieldErr.address}</small>
              )}
            </label>
          </div>

          <div className="row two">
            <label>
              <span>Latitude *</span>
              <input
                className={
                  "input" +
                  (fieldErr.lat || fieldErr.coords ? " is-invalid" : "")
                }
                name="lat"
                value={form.lat}
                onChange={onChange}
                placeholder="6.927079"
                required
              />
              {(fieldErr.lat || fieldErr.coords) && (
                <small className="field-error">
                  {fieldErr.lat || fieldErr.coords}
                </small>
              )}
            </label>
            <label>
              <span>Longitude *</span>
              <input
                className={
                  "input" +
                  (fieldErr.lng || fieldErr.coords ? " is-invalid" : "")
                }
                name="lng"
                value={form.lng}
                onChange={onChange}
                placeholder="79.861244"
                required
              />
              {(fieldErr.lng || fieldErr.coords) && (
                <small className="field-error">
                  {fieldErr.lng || fieldErr.coords}
                </small>
              )}
            </label>
          </div>

          <div className="row">
            <button type="button" className="btn ghost" onClick={useMyLocation}>
              Use my current location
            </button>
          </div>

          <div className="row">
            <label className="upload">
              <span>Attach new media (max 2)</span>
              <input
                type="file"
                name="media"
                multiple
                accept=".jpg,.jpeg,.png,.webp,.avif,.mp4,.mov,.webm"
                onChange={onChange}
              />
              {!!previews.length && (
                <div className="previews">
                  {previews.map((p, i) =>
                    /^video\//.test(p.file.type) ? (
                      <video
                        key={i}
                        src={p.url}
                        className="preview-vid"
                        controls
                      />
                    ) : (
                      <img key={i} src={p.url} alt="" className="preview-img" />
                    )
                  )}
                </div>
              )}
            </label>
          </div>

          {/* Show a tiny note near the upload section when there are no old files */}
          {!victim.media?.length && (
            <p className="muted-note">No existing attachments to remove.</p>
          )}

          {/* Only render the full removal UI when there ARE files */}
          {victim.media?.length > 0 && (
            <div className="row remove-block">
              <h4 className="sub">Remove existing attachments</h4>
              <div className="remove-grid">
                {victim.media.map((m, i) => (
                  <label key={m.filename || m.url || i} className="rem-item">
                    <input
                      type="checkbox"
                      onChange={(e) =>
                        toggleRemove(m.filename, e.target.checked)
                      }
                    />
                    <span className="rem-name">{m.filename || m.url}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="row">
            <label>
              <span>Description</span>
              <textarea
                className="textarea"
                name="description"
                value={form.description}
                onChange={onChange}
                placeholder="Briefly describe what changed…"
              />
            </label>
          </div>

          <div className="actions">
            <button className="btn primary" type="submit">
              Save changes
            </button>
          </div>
        </form>

        {/* Right Side Panel - Map and Attachments */}
        <div className="right-panel">
          {/* Location Map */}
          <div className="card side">
            <h3 className="side-title">Incident Location</h3>
            {form.lat && form.lng ? (
              <iframe
                title="Incident location map"
                src={`https://maps.google.com/maps?q=${form.lat},${form.lng}&z=14&output=embed`}
                loading="lazy"
                allowFullScreen
                className="map-iframe"
              />
            ) : (
              <div className="blank">
                📍 No location data available
              </div>
            )}
          </div>

          {/* Current Attachments */}
          <div className="card side">
            <h3 className="side-title">Current Attachments</h3>
            {victim.media && victim.media.length > 0 ? (
              <div className="side-grid">
                {victim.media.map((mediaItem, index) => {
                  const url = mediaItem.url || (mediaItem.filename ? `http://localhost:5000/uploads/${mediaItem.filename}` : null);
                  const type = mediaItem?.mimetype || url || "";
                  const isImage = /image/i.test(type);
                  const isVideo = /video/i.test(type);
                  
                  return (
                    <a 
                      key={url || mediaItem.filename || index} 
                      className="side-tile" 
                      href={url || "#"} 
                      target="_blank" 
                      rel="noreferrer"
                      title={mediaItem.filename || `Attachment ${index + 1}`}
                    >
                      {isImage ? (
                        <img src={url} alt={`Attachment ${index + 1}`} />
                      ) : isVideo ? (
                        <video src={url} controls />
                      ) : (
                        <div className="doc">
                          📄 {mediaItem.filename || `File ${index + 1}`}
                        </div>
                      )}
                    </a>
                  );
                })}
              </div>
            ) : (
              <div className="blank">
                📎 No attachments available
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
