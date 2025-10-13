
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "../../api/axios";
import "./AlertAdd.css";

const DISTRICTS = [
  "Ampara",
  "Anuradhapura",
  "Badulla",
  "Batticaloa",
  "Colombo",
  "Galle",
  "Gampaha",
  "Hambantota",
  "Jaffna",
  "Kalutara",
  "Kandy",
  "Kegalle",
  "Kilinochchi",
  "Kurunegala",
  "Mannar",
  "Matale",
  "Matara",
  "Monaragala",
  "Mullaitivu",
  "Nuwara Eliya",
  "Polonnaruwa",
  "Puttalam",
  "Ratnapura",
  "Trincomalee",
  "Vavuniya",
];

// ------- Small helpers -------
const fmt = (n, u = "") =>
  n === null || n === undefined ? "—" : `${Math.round(n)}${u}`;

function useOpenMeteo({ query }) {
  const [state, setState] = useState({ loading: false, error: "", data: null });

  useEffect(() => {
    let off = false;
    (async () => {
      if (!query) {
        setState({ loading: false, error: "", data: null });
        return;
      }
      setState({ loading: true, error: "", data: null });
      try {
        // 1) Geocode
        const gR = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
            query
          )}&count=1&language=en&format=json`
        );
        const gJ = await gR.json();
        const loc = gJ?.results?.[0];
        if (!loc) throw new Error("place not found");

        const { latitude, longitude } = loc;
        const wR = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m&hourly=precipitation_probability`
        );
        const wJ = await wR.json();
        if (!off)
          setState({ loading: false, error: "", data: { loc, weather: wJ } });
      } catch (e) {
        if (!off)
          setState({
            loading: false,
            error: e?.message || "failed",
            data: null,
          });
      }
    })();
    return () => {
      off = true;
    };
  }, [query]);

  return state;
}

function WeatherCard({ district, disLocation }) {
  const query = useMemo(() => {
    
    const base = disLocation?.trim() ? `${disLocation}, ${district}` : district;
    return base ? `${base}, Sri Lanka` : "Sri Lanka";
  }, [district, disLocation]);

  const { loading, error, data } = useOpenMeteo({ query });
  const current = data?.weather?.current ?? {};
  const place = data?.loc?.name || district || "Sri Lanka";

  return (
    <div className="aa-card">
      <div className="aa-ct">Live Weather</div>
      {loading ? (
        <div className="aa-skeleton" aria-hidden>
          <div className="aa-skel-row" />
          <div className="aa-skel-row" />
        </div>
      ) : error ? (
        <div className="aa-err">Couldn't load weather ({error}).</div>
      ) : (
        <div className="aa-weather">
          <div className="aa-place">{place}</div>
          <div className="aa-wrow">
            <div className="aa-wstat">
              <div className="aa-wv">{fmt(current.temperature_2m, "°C")}</div>
              <div className="aa-wl">Temp</div>
            </div>
            <div className="aa-wstat">
              <div className="aa-wv">
                {fmt(current.relative_humidity_2m, "%")}
              </div>
              <div className="aa-wl">Humidity</div>
            </div>
            <div className="aa-wstat">
              <div className="aa-wv">
                {fmt(current.wind_speed_10m, " km/h")}
              </div>
              <div className="aa-wl">Wind</div>
            </div>
            <div className="aa-wstat">
              <div className="aa-wv">{fmt(current.precipitation, " mm")}</div>
              <div className="aa-wl">Precip</div>
            </div>
          </div>
          <div className="aa-whint">source: open‑meteo.com (no API key)</div>
        </div>
      )}
    </div>
  );
}

function EmergencyContactsCard() {
  
  const CONTACTS = [
    { label: "Disaster Management Centre (Hotline)", tel: "117" },
    { label: "Police Emergency", tel: "119" },
    { label: "Ambulance Service", tel: "1990" },
    { label: "Fire & Rescue (Colombo)", tel: "110" },
  ];
  return (
    <div className="aa-card">
      <div className="aa-ct">Emergency Contacts</div>
      <ul className="aa-list">
        {CONTACTS.map((c) => (
          <li key={c.label} className="aa-li">
            <div className="aa-li-title">{c.label}</div>
            <a className="aa-li-tel" href={`tel:${c.tel}`}>
              {c.tel}
            </a>
          </li>
        ))}
      </ul>
      <div className="aa-muted">
        Please confirm with official sources for your district.
      </div>
    </div>
  );
}

export default function AlertAdd() {
  const navigate = useNavigate();
  const [inputs, setInputs] = useState({
    alertType: "green",
    topic: "",
    message: "",
    district: "",
    disLocation: "",
    adminName: "System Admin",
  });
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) =>
    setInputs((s) => ({ ...s, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!inputs.topic.trim() || !inputs.message.trim()) {
      alert("Topic and Message are required");
      return;
    }
    if (!inputs.district) {
      alert("Please select a district");
      return;
    }
    if (inputs.alertType === "red") {
      const ok = window.confirm(
        "This will create a RED (emergency) alert. Continue?"
      );
      if (!ok) return;
    }
    try {
      setSubmitting(true);
      const { data } = await axios.post("/alerts", { ...inputs });
      if (!data?.ok)
        throw new Error(data?.message || "Server did not confirm save");
      alert("✅ Alert added successfully!");
      navigate("/AdminHome/toAlerts");
    } catch (err) {
      alert(
        "❌ Failed to add alert: " +
          (err?.response?.data?.message || err.message)
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="aa-page">
      <div className="aa-grid">2
        <div className="aa-main">
          <div className="aa-card">
            <h1 className="aa-title">Add Alert</h1>
            <form className="aa-form" onSubmit={onSubmit}>
              <label>
                Alert Type
                <select
                  name="alertType"
                  value={inputs.alertType}
                  onChange={onChange}
                >
                  <option value="green">Green (district)</option>
                  <option value="red">Red (emergency)</option>
                </select>
              </label>

              <label>
                Topic
                <input
                  name="topic"
                  value={inputs.topic}
                  onChange={onChange}
                  required
                  maxLength={140}
                  placeholder="e.g., Flood Warning"
                />
              </label>

              <label>
                Message
                <textarea
                  name="message"
                  value={inputs.message}
                  onChange={onChange}
                  required
                  rows={4}
                  maxLength={2000}
                  placeholder="Add clear instructions / details…"
                />
              </label>

              <div className="aa-row">
                <label>
                  District
                  <select
                    name="district"
                    value={inputs.district}
                    onChange={onChange}
                    required
                  >
                    <option value="">-- Select District --</option>
                    {DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Location
                  <input
                    name="disLocation"
                    value={inputs.disLocation}
                    onChange={onChange}
                    placeholder="e.g., Kotte DS Division"
                  />
                </label>
              </div>

              <label>
                Admin Type
                <select
                  name="adminName"
                  value={inputs.adminName}
                  onChange={onChange}
                  required
                >
                  <option value="System Admin">System Admin</option>
                  <option value="Disaster Management Officer">
                    Disaster Management Officer
                  </option>
                  <option value="Other">Other</option>
                </select>
              </label>

              <div className="aa-actions">
                <button
                  type="submit"
                  disabled={submitting}
                  className="aa-btn aa-primary"
                >
                  {submitting ? "Saving…" : "Submit Alert"}
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/AdminHome/toAlerts")}
                  className="aa-btn aa-secondary"
                >
                  ⬅ Back to Alerts
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ===== Right: Live Weather + Emergency Contacts ===== */}
        <aside className="aa-aside">
          <WeatherCard
            district={inputs.district}
            disLocation={inputs.disLocation}
          />
          <EmergencyContactsCard />
        </aside>
      </div>
    </div>
  );
}
