import React, { useState, useCallback } from "react";
import api from "../../api/axios";
import "./ReportGenarator.css";

const districts = [
  "all","Colombo","Gampaha","Kalutara","Kandy","Galle",
  "Matara","Hambantota","Jaffna","Kurunegala"
];

const isoLocal = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const addDaysLocal = (d, days) => {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
};
const TODAY = isoLocal(new Date());

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

const normalizeSeverity = (item) => {
  const candidates = [
    item?.severity, item?.level, item?.status, item?.priority, item?.type,
    item?.sev, item?.alertLevel, item?.alert_level, item?.risk, item?.danger
  ].filter((v) => v !== undefined && v !== null);
  if (!candidates.length) return { text: "—", cls: "sev-unknown" };
  let raw = String(candidates[0]).trim();
  if (/^(0|1)$/.test(raw)) raw = raw === "1" ? "red" : "green";
  if (/^(true|false)$/i.test(raw)) raw = raw.toLowerCase() === "true" ? "red" : "green";
  const s = raw.toLowerCase();
  const greenSyn = ["green", "ok", "safe", "normal", "low", "minor"];
  const redSyn   = ["red", "danger", "critical", "high", "major", "alert", "severe"];
  if (greenSyn.includes(s)) return { text: "Green", cls: "sev-green" };
  if (redSyn.includes(s))   return { text: "Red",   cls: "sev-red" };
  return { text: raw, cls: `sev-${s.replace(/\s+/g, "-")}` };
};

const getDateTime = (item) =>
  item?.createdAt || item?.created_at || item?.date || item?.timestamp || item?.time || item?.updatedAt || null;

const getDistrict = (item) =>
  item?.district || item?.area || item?.region || item?.location || "—";

const getTitle = (item) => item?.title || item?.headline || item?.summary || item?.description || "—";

export default function AlertReport() {
  const [from, setFrom] = useState(isoLocal(addDaysLocal(new Date(), -7)));
  const [to,   setTo]   = useState(TODAY);
  const [severity, setSeverity] = useState("all");
  const [district, setDistrict] = useState("all");
  const [loading, setLoading]   = useState(false);
  const [err, setErr]           = useState("");
  const [items, setItems]       = useState([]);
  const [totals, setTotals]     = useState({ total: 0, red: 0, green: 0 });

  const load = useCallback(async () => {
    let safeTo = to > TODAY ? TODAY : to;
    let safeFrom = from > safeTo ? safeTo : from;
    if (safeFrom > safeTo) {
      setErr("'From' date cannot be after 'To' date.");
      return;
    }
    setFrom(safeFrom);
    setTo(safeTo);
    setLoading(true);
    setErr("");
    try {
      const res = await api.get("/alerts/report", {
        params: { from: safeFrom, to: safeTo, severity, district },
        validateStatus: () => true,
        withCredentials: true,
      });
      if (res.data?.ok) {
        setItems(res.data.items || []);
        setTotals({
          total: res.data.total || 0,
          red:   res.data.red   || 0,
          green: res.data.green || 0,
        });
      } else {
        setErr(res.data?.message || "Failed to load");
      }
    } catch (e) {
      setErr(e?.response?.data?.message || e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [from, to, severity, district]);

  const downloadPdf = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    const safeTo = to > TODAY ? TODAY : to;
    const safeFrom = from > safeTo ? safeTo : from;
    const qs = new URLSearchParams({
      from: safeFrom,
      to: safeTo,
      severity,
      district
    }).toString();
    window.open(`${API}/alerts/report/pdf?${qs}`, "_blank", "noopener");
  };

  return (
    <div className="rg-page">
      <div className="rg-card">
        <div className="rg-header">
          <h2>Alert Report</h2>
          <div className="rg-sub">Range: {from} – {to}</div>
        </div>

        <form
          className="rg-filters"
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
        >
          <div className="rg-row">
            <label>From
              <input
                type="date"
                value={from}
                max={to}
                onChange={(e) => {
                  let f = e.target.value;
                  if (f > to) f = to;
                  if (f > TODAY) f = TODAY;
                  setFrom(f);
                }}
              />
            </label>
            <label>To
              <input
                type="date"
                value={to}
                min={from}
                max={TODAY}
                onChange={(e) => {
                  let t = e.target.value;
                  if (t > TODAY) t = TODAY;
                  if (t < from)  t = from;
                  setTo(t);
                }}
              />
            </label>
            <label>Severity
              <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
                <option value="all">All</option>
                <option value="green">Green</option>
                <option value="red">Red</option>
              </select>
            </label>
            <label>District
              <select value={district} onChange={(e) => setDistrict(e.target.value)}>
                {districts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <button className="rg-btn" disabled={loading}>
              {loading ? "Loading…" : "Apply"}
            </button>
            <button
              type="button"
              className="rg-btn"
              onClick={downloadPdf}
              disabled={loading || items.length === 0}
            >
              Download PDF
            </button>
          </div>
        </form>

        {err && <div className="rg-error">⚠️ {err}</div>}

        <div className="rg-kpis">
          <div className="rg-kpi"><div className="rg-v">{totals.total}</div><div className="rg-l">Total</div></div>
          <div className="rg-kpi good"><div className="rg-v">{totals.green}</div><div className="rg-l">Green</div></div>
          <div className="rg-kpi danger"><div className="rg-v">{totals.red}</div><div className="rg-l">Red</div></div>
        </div>

        <div className="rg-table" aria-busy={loading}>
          {loading ? (
            <div className="rg-skel">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="rg-skel-row" />)}
            </div>
          ) : items.length ? (
            <table>
              <thead>
                <tr>
                  <th>Date/Time</th>
                  <th>Severity</th>
                  <th>District</th>
                  <th>Title</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => {
                  const sev = normalizeSeverity(a);
                  const dt = getDateTime(a);
                  return (
                    <tr key={a._id || a.id || `${getTitle(a)}-${dt || Math.random()}`}>
                      <td>{dt ? new Date(dt).toLocaleString() : "—"}</td>
                      <td>
                        <span className={`sev ${sev.cls}`}>{sev.text}</span>
                      </td>
                      <td>{getDistrict(a)}</td>
                      <td className="cut" title={getTitle(a)}>
                        {getTitle(a)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="rg-empty">No alerts match the selected filters.</div>
          )}
        </div>
      </div>
    </div>
  );
}
